const path = require("node:path");
const { DEFAULTS } = require("./constants");

function getConfig() {
  const dataDir = process.env.WIKIPEDIA_INDEX_DATA_DIR ?? DEFAULTS.dataDir;
  const dbPath =
    process.env.WIKIPEDIA_INDEX_DB_PATH ??
    path.join(dataDir, DEFAULTS.dbRelativePath);
  const cacheDir = path.join(dataDir, DEFAULTS.cacheRelativePath);
  const metadataPath = path.join(dataDir, DEFAULTS.metadataRelativePath);
  const runDir = path.join(dataDir, DEFAULTS.runDirRelativePath);

  return {
    dataDir,
    cacheDir,
    dbPath,
    metadataPath,
    runDir,
    buildLockPath: path.join(runDir, DEFAULTS.buildLockName),
    serviceLockPath: path.join(runDir, DEFAULTS.serviceLockName),
    readyPath: path.join(runDir, DEFAULTS.readyName),
    host: DEFAULTS.host,
    port: toInt(process.env.SECS_WIKI_INDEX_PORT, DEFAULTS.port),
    maxRows: toInt(process.env.WIKIPEDIA_INDEX_MAX_ROWS, DEFAULTS.maxRows),
    maxResponseBytes: toInt(
      process.env.WIKIPEDIA_INDEX_MAX_RESPONSE_BYTES,
      DEFAULTS.maxResponseBytes
    ),
    maxParamCount: toInt(
      process.env.WIKIPEDIA_INDEX_MAX_PARAM_COUNT,
      DEFAULTS.maxParamCount
    ),
    cacheEnabled: toBool(
      process.env.WIKIPEDIA_INDEX_CACHE_ENABLED,
      DEFAULTS.cacheEnabled
    ),
    cacheTtlSeconds: toIntMin(
      process.env.WIKIPEDIA_INDEX_CACHE_TTL_SECONDS,
      DEFAULTS.cacheTtlSeconds,
      0
    ),
    cacheMaxEntries: toIntMin(
      process.env.WIKIPEDIA_INDEX_CACHE_MAX_ENTRIES,
      DEFAULTS.cacheMaxEntries,
      0
    ),
  };
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function toIntMin(value, fallback, min) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < min) {
    return fallback;
  }
  return parsed;
}

function toBool(value, fallback) {
  if (value === undefined) return fallback;
  const normalized = `${value}`.trim().toLowerCase();
  if (normalized === "1" || normalized === "true") return true;
  if (normalized === "0" || normalized === "false") return false;
  return fallback;
}

module.exports = {
  getConfig,
};
