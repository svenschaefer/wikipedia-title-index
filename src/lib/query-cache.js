const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function createQueryCache(config, options = {}) {
  if (!config.cacheEnabled) {
    return createNoopCache();
  }

  let dbFingerprint;
  try {
    fs.mkdirSync(config.cacheDir, { recursive: true });
    dbFingerprint = getDbFingerprint(config.dbPath);
  } catch {
    return createNoopCache();
  }
  const validatePayload = options.validatePayload ?? isCachedPayload;

  function get(query) {
    const entryPath = getEntryPath(config.cacheDir, dbFingerprint, query);
    if (!fs.existsSync(entryPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(entryPath, "utf8");
      const parsed = JSON.parse(content);
      return validatePayload(parsed) ? parsed : null;
    } catch {
      try {
        fs.unlinkSync(entryPath);
      } catch {}
      return null;
    }
  }

  function set(query, payload) {
    const entryPath = getEntryPath(config.cacheDir, dbFingerprint, query);
    if (fs.existsSync(entryPath)) {
      return;
    }
    const entryDir = path.dirname(entryPath);
    fs.mkdirSync(entryDir, { recursive: true });

    const tempPath = path.join(
      entryDir,
      `.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`
    );
    try {
      fs.writeFileSync(tempPath, JSON.stringify(payload));
      fs.renameSync(tempPath, entryPath);
    } catch {
      // Cache write failures must not fail query execution.
    } finally {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
    }
    cleanupCache(config.cacheDir, config.cacheTtlSeconds, config.cacheMaxEntries);
  }

  function clear() {
    return clearQueryCache(config.cacheDir);
  }

  return {
    get,
    set,
    clear,
  };
}

function getDbFingerprint(dbPath) {
  const stats = fs.statSync(dbPath);
  return `${dbPath}:${stats.size}:${stats.mtimeMs}`;
}

function getEntryPath(cacheDir, dbFingerprint, query) {
  const hash = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        db: dbFingerprint,
        sql: query.sql,
        params: query.params,
        maxRows: query.maxRows,
      })
    )
    .digest("hex");
  return getShardedEntryPath(cacheDir, hash);
}

function isCachedPayload(value) {
  if (!value || typeof value !== "object") return false;
  if (!Array.isArray(value.columns)) return false;
  if (!Array.isArray(value.rows)) return false;
  if (!Number.isInteger(value.row_count) || value.row_count < 0) return false;
  if (typeof value.truncated !== "boolean") return false;
  return true;
}

function clearQueryCache(cacheDir) {
  if (!fs.existsSync(cacheDir)) return 0;
  const deleted = listCacheJsonFiles(cacheDir).length;
  fs.rmSync(cacheDir, { recursive: true, force: true });
  fs.mkdirSync(cacheDir, { recursive: true });
  return deleted;
}

function cleanupCache(cacheDir, ttlSeconds, maxEntries) {
  if (!fs.existsSync(cacheDir)) return;
  const now = Date.now();
  const files = [];
  for (const filePath of listCacheJsonFiles(cacheDir)) {
    let stats;
    try {
      stats = fs.statSync(filePath);
    } catch {
      continue;
    }

    if (ttlSeconds > 0 && stats.mtimeMs < now - ttlSeconds * 1000) {
      try {
        fs.unlinkSync(filePath);
      } catch {}
      continue;
    }

    files.push({ filePath, mtimeMs: stats.mtimeMs });
  }

  if (maxEntries > 0 && files.length > maxEntries) {
    files.sort((a, b) => a.mtimeMs - b.mtimeMs);
    const overflowCount = files.length - maxEntries;
    for (let i = 0; i < overflowCount; i += 1) {
      try {
        fs.unlinkSync(files[i].filePath);
      } catch {}
    }
  }
}

function listCacheJsonFiles(rootDir) {
  const files = [];
  walkCacheDirectory(rootDir, files);
  return files;
}

function walkCacheDirectory(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkCacheDirectory(fullPath, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }
}

function getShardedEntryPath(cacheDir, hash) {
  const levelOne = hash.slice(0, 2);
  const levelTwo = hash.slice(2, 4);
  return path.join(cacheDir, levelOne, levelTwo, `${hash}.json`);
}

function createNoopCache() {
  return {
    get() {
      return null;
    },
    set() {},
    clear() {
      return 0;
    },
  };
}

module.exports = {
  createQueryCache,
  getDbFingerprint,
  getEntryPath,
  isCachedPayload,
  clearQueryCache,
  cleanupCache,
  createNoopCache,
  getShardedEntryPath,
  listCacheJsonFiles,
};
