const path = require("node:path");
const { DEFAULTS } = require("./constants");

function getConfig() {
  const dataDir = process.env.WIKIPEDIA_INDEX_DATA_DIR ?? DEFAULTS.dataDir;
  const dbPath =
    process.env.WIKIPEDIA_INDEX_DB_PATH ??
    path.join(dataDir, DEFAULTS.dbRelativePath);
  const metadataPath = path.join(dataDir, DEFAULTS.metadataRelativePath);
  const runDir = path.join(dataDir, DEFAULTS.runDirRelativePath);

  return {
    dataDir,
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
  };
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

module.exports = {
  getConfig,
};
