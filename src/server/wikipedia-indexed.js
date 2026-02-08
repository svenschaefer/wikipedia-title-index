const fs = require("node:fs");
const http = require("node:http");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const { API_VERSION } = require("../lib/constants");
const { getConfig } = require("../lib/paths");
const { acquireProcessLock } = require("../lib/process-lock");
const { ensureIndexReady } = require("../lib/autosetup");
const {
  validateQueryRequest,
  createAuthorizer,
  createClientError,
} = require("../lib/sql-policy");

async function startServer() {
  const config = getConfig();
  fs.mkdirSync(config.runDir, { recursive: true });

  if (fs.existsSync(config.buildLockPath)) {
    throw new Error("Build lock already exists");
  }

  await ensureIndexReady(config);

  const releaseServiceLock = acquireProcessLock(
    config.serviceLockPath,
    "wikipedia-indexed"
  );

  const db = new DatabaseSync(config.dbPath, { readOnly: true });
  db.exec("PRAGMA query_only=ON");
  db.setAuthorizer(createAuthorizer());

  logEvent("startup", { host: config.host, port: config.port, db_path: config.dbPath });

  const server = http.createServer((req, res) => {
    const requestId = crypto.randomUUID();
    const startedAt = process.hrtime.bigint();

    handleRequest(req, res, db, config)
      .then((meta) => {
        logRequest(requestId, startedAt, meta, req.url ?? "");
      })
      .catch((error) => {
        const payload = mapError(error);
        const bytesOut = sendJson(res, payload.status, payload.body);
        logRequest(
          requestId,
          startedAt,
          {
            status: payload.status,
            row_count: 0,
            truncated: false,
            bytes_out: bytesOut,
          },
          req.url ?? ""
        );
      });
  });

  let closed = false;
  const closeAll = () => {
    if (closed) return;
    closed = true;
    try {
      if (server.listening) {
        server.close();
      }
    } catch {}
    try {
      db.close();
    } catch {}
    try {
      if (fs.existsSync(config.readyPath)) fs.unlinkSync(config.readyPath);
    } catch {}
    try {
      releaseServiceLock();
    } catch {}
    logEvent("shutdown", {});
  };

  process.on("SIGINT", () => {
    closeAll();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    closeAll();
    process.exit(0);
  });

  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(config.port, config.host, resolve);
    });
  } catch (error) {
    closeAll();
    throw error;
  }

  writeReadyFile(config);
  console.log(`wikipedia-indexed listening on http://${config.host}:${config.port}`);
}

async function handleRequest(req, res, db, config) {
  if (req.method === "GET" && req.url === "/health") {
    const stats = fs.statSync(config.dbPath);
    const bytesOut = sendJson(res, 200, {
      status: "ok",
      api_version: API_VERSION,
      db_path: config.dbPath,
      db_size_bytes: stats.size,
      db_mtime: stats.mtime.toISOString(),
    });
    return {
      status: 200,
      row_count: 0,
      truncated: false,
      bytes_out: bytesOut,
    };
  }

  if (req.method === "POST" && req.url === "/v1/titles/query") {
    const body = await readJsonBody(req, config.maxResponseBytes);
    const sql = body.sql;
    const params = body.params ?? [];
    validateQueryRequest(sql, params, config);

    const requestedMaxRows = Number.parseInt(
      `${body.max_rows ?? config.maxRows}`,
      10
    );
    if (!Number.isFinite(requestedMaxRows) || requestedMaxRows <= 0) {
      throw createClientError("INVALID_REQUEST", "max_rows must be a positive integer");
    }
    const maxRows = Math.min(requestedMaxRows, config.maxRows);

    const statement = db.prepare(`SELECT * FROM (${sql}) AS q LIMIT ?`);
    const rows = statement.all(...params, maxRows + 1);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const truncated = rows.length > maxRows;
    const visibleRows = truncated ? rows.slice(0, maxRows) : rows;
    const payload = {
      columns,
      rows: visibleRows.map((row) => columns.map((col) => row[col])),
      row_count: visibleRows.length,
      truncated,
    };
    const bytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
    if (bytes > config.maxResponseBytes) {
      throw createClientError(
        "LIMIT_EXCEEDED",
        "Response payload exceeds configured max bytes"
      );
    }
    const bytesOut = sendJson(res, 200, payload);
    return {
      status: 200,
      row_count: payload.row_count,
      truncated: payload.truncated,
      bytes_out: bytesOut,
    };
  }

  const bytesOut = sendJson(res, 404, {
    error: {
      code: "NOT_FOUND",
      message: "Endpoint not found",
    },
  });
  return {
    status: 404,
    row_count: 0,
    truncated: false,
    bytes_out: bytesOut,
  };
}

function writeReadyFile(config) {
  const payload = {
    host: config.host,
    port: config.port,
    db_path: config.dbPath,
    api_version: API_VERSION,
    started_at: new Date().toISOString(),
  };
  fs.writeFileSync(config.readyPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function sendJson(res, status, body) {
  const serialized = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(serialized);
  return Buffer.byteLength(serialized, "utf8");
}

function mapError(error) {
  if (error.code === "INVALID_REQUEST") {
    return { status: 400, body: errorBody(error) };
  }
  if (error.code === "QUERY_REJECTED") {
    return { status: 403, body: errorBody(error) };
  }
  if (error.code === "LIMIT_EXCEEDED") {
    return { status: 413, body: errorBody(error) };
  }
  if (
    typeof error.message === "string" &&
    (error.message.includes("not authorized") ||
      error.message.includes("prohibited"))
  ) {
    return {
      status: 403,
      body: {
        error: { code: "QUERY_REJECTED", message: "SQLite authorizer rejected query" },
      },
    };
  }
  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: error.message ?? "Unexpected error",
      },
    },
  };
}

function errorBody(error) {
  return {
    error: {
      code: error.code,
      message: error.message,
    },
  };
}

async function readJsonBody(req, maxBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      throw createClientError("LIMIT_EXCEEDED", "Request body too large");
    }
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw createClientError("INVALID_REQUEST", "Request body must be valid JSON");
  }
}

function logRequest(requestId, startedAt, meta, endpoint) {
  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  logEvent("request", {
    requestId,
    endpoint,
    status: meta.status,
    row_count: meta.row_count,
    truncated: meta.truncated,
    duration_ms: Number(durationMs.toFixed(3)),
    bytes_out: meta.bytes_out,
  });
}

function logEvent(event, fields) {
  const payload = {
    ts: new Date().toISOString(),
    event,
    ...fields,
  };
  console.log(JSON.stringify(payload));
}

async function main() {
  await startServer();
}

if (require.main === module) {
  main().catch((error) => {
    logEvent("fatal", { message: error.message ?? "Unexpected error" });
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  startServer,
  main,
};
