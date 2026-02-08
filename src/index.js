const { buildIndex } = require("./cli/build");
const { startServer } = require("./server/wikipedia-indexed");
const { ensureIndexReady, getIndexState } = require("./lib/autosetup");
const { getConfig } = require("./lib/paths");

module.exports = {
  buildIndex,
  startServer,
  ensureIndexReady,
  getIndexState,
  getConfig,
};
