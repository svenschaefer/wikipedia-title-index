const path = require("node:path");

const API_VERSION = "1.2.0";
const SCHEMA_VERSION = "1";
const SOURCE_TYPE = "all-titles-in-ns0";
const DEFAULT_SOURCE_URL =
  "https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-all-titles-in-ns0.gz";

const DEFAULTS = {
  dataDir: "data",
  cacheRelativePath: "cache",
  dbRelativePath: path.join("index", "titles.db"),
  metadataRelativePath: path.join("index", "metadata.json"),
  runDirRelativePath: "run",
  buildLockName: "wikipedia-build.lock",
  serviceLockName: "wikipedia-indexed.lock",
  readyName: "wikipedia-indexed.ready",
  host: "127.0.0.1",
  port: 32123,
  maxRows: 1000,
  maxResponseBytes: 1_000_000,
  maxParamCount: 1000,
  cacheEnabled: true,
  cacheTtlSeconds: 24 * 60 * 60,
  cacheMaxEntries: 10_000,
  batchSize: 10_000,
};

module.exports = {
  API_VERSION,
  SCHEMA_VERSION,
  SOURCE_TYPE,
  DEFAULT_SOURCE_URL,
  DEFAULTS,
};


