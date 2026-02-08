const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const readline = require("node:readline");
const { Readable } = require("node:stream");
const { DatabaseSync } = require("node:sqlite");
const {
  SOURCE_TYPE,
  SCHEMA_VERSION,
  DEFAULTS,
  DEFAULT_SOURCE_URL,
} = require("./lib/constants");
const { getConfig } = require("./lib/paths");
const { acquireProcessLock } = require("./lib/process-lock");

async function buildIndex(options = {}) {
  const config = getConfig();
  const fileArg = options.file ?? null;
  const urlArg = options.url ?? process.env.WIKIPEDIA_INDEX_SOURCE_URL ?? null;
  const source = resolveSource(fileArg, urlArg);
  const release = options.skipLock ? () => {} : acquireBuildLock(config);

  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

  const db = new DatabaseSync(config.dbPath);
  let completed = false;
  let lineReader = null;
  let rawStream = null;
  let finalStream = null;
  let rowCount = 0;

  try {
    db.exec("PRAGMA journal_mode=WAL");
    db.exec("DROP TABLE IF EXISTS titles_build");
    db.exec("CREATE TABLE titles_build (t TEXT PRIMARY KEY)");

    const insert = db.prepare(
      "INSERT OR IGNORE INTO titles_build (t) VALUES (?)"
    );
    const batch = [];

    rawStream = await openSourceStream(source);
    finalStream = source.isGzip ? rawStream.pipe(zlib.createGunzip()) : rawStream;
    lineReader = readline.createInterface({
      input: finalStream,
      crlfDelay: Infinity,
    });

    for await (const line of lineReader) {
      const title = extractTitle(line, source.kind);
      if (!title) {
        continue;
      }
      batch.push(normalizeTitle(title));
      if (batch.length === DEFAULTS.batchSize) {
        flushBatch(db, insert, batch);
        rowCount += batch.length;
        batch.length = 0;
        if (rowCount % 1_000_000 === 0) {
          console.log(`Indexed ${rowCount.toLocaleString()} titles`);
        }
      }
    }

    if (batch.length > 0) {
      flushBatch(db, insert, batch);
      rowCount += batch.length;
    }

    swapTables(db);
    writeMetadata(config.metadataPath, {
      source_url: source.url ?? null,
      source_file: source.file ?? null,
      source_type: SOURCE_TYPE,
      built_at: new Date().toISOString(),
      package_version: "local-secos",
      schema_version: SCHEMA_VERSION,
      row_count: rowCount,
    });
    completed = true;
    console.log(`Done (${rowCount.toLocaleString()} rows)`);
  } finally {
    lineReader?.close();
    finalStream?.destroy();
    rawStream?.destroy();
    if (!completed) {
      db.exec("DROP TABLE IF EXISTS titles_build");
    }
    db.close();
    release();
  }
}

function resolveSource(fileArg, urlArg) {
  if (fileArg && urlArg) {
    throw new Error("Provide either --file or --url, not both.");
  }

  if (urlArg) {
    return {
      kind: classifySource(urlArg),
      isGzip: urlArg.endsWith(".gz"),
      url: urlArg,
      file: null,
    };
  }

  if (fileArg) {
    return {
      kind: classifySource(fileArg),
      isGzip: fileArg.endsWith(".gz"),
      url: null,
      file: fileArg,
    };
  }

  const defaultUrl = DEFAULT_SOURCE_URL;
  return {
    kind: classifySource(defaultUrl),
    isGzip: defaultUrl.endsWith(".gz"),
    url: defaultUrl,
    file: null,
  };
}

function classifySource(identifier) {
  if (
    identifier.includes("all-titles-in-ns0") ||
    identifier.endsWith(".ns0.txt")
  ) {
    return "ns0-only";
  }
  return "all-titles";
}

function extractTitle(line, kind) {
  if (!line) {
    return null;
  }
  if (kind === "ns0-only") {
    return line;
  }
  const tabIndex = line.indexOf("\t");
  if (tabIndex < 0) {
    return null;
  }
  if (line.slice(0, tabIndex) !== "0") {
    return null;
  }
  return line.slice(tabIndex + 1);
}

function normalizeTitle(value) {
  return value.replaceAll("_", " ");
}

function flushBatch(db, insert, rows) {
  db.exec("BEGIN");
  try {
    for (const row of rows) {
      insert.run(row);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function swapTables(db) {
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec("DROP TABLE IF EXISTS titles");
    db.exec("ALTER TABLE titles_build RENAME TO titles");
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function writeMetadata(metadataPath, metadata) {
  fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
}

function acquireBuildLock(config) {
  fs.mkdirSync(config.runDir, { recursive: true });
  if (fs.existsSync(config.serviceLockPath)) {
    throw new Error("Cannot build while service lock exists.");
  }
  return acquireProcessLock(config.buildLockPath, "wikipedia-build");
}

async function openSourceStream(source) {
  if (source.url) {
    const response = await fetch(source.url);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to fetch source: ${response.status}`);
    }
    return Readable.fromWeb(response.body);
  }

  if (!fs.existsSync(source.file)) {
    throw new Error(`Source file not found: ${source.file}`);
  }
  return fs.createReadStream(source.file);
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--file") {
      options.file = argv[i + 1];
      i += 1;
    } else if (arg === "--url") {
      options.url = argv[i + 1];
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function main() {
  await buildIndex(parseArgs(process.argv.slice(2)));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  buildIndex,
};
