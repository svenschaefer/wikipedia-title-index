const { buildIndex } = require("./build-title-index");
const { startServer } = require("./wikipedia-indexed");
const { ensureIndexReady, getIndexState } = require("./lib/autosetup");
const { getConfig } = require("./lib/paths");

module.exports = {
  buildIndex,
  startServer,
  ensureIndexReady,
  getIndexState,
  getConfig,
};
