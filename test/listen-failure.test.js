const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const {
  makeTempWorkspace,
  copyFixture,
  runNode,
  randomPort,
  removeTree,
} = require("./test-helpers");

const PROJECT_DIR = path.resolve(__dirname, "..");
const BUILD_SCRIPT = path.join(PROJECT_DIR, "src", "cli", "build.js");
const SERVICE_SCRIPT = path.join(PROJECT_DIR, "src", "server", "wikipedia-indexed.js");

test("service releases lock when listen() fails", async () => {
  const temp = makeTempWorkspace("listen-fail");
  const dataDir = path.join(temp, "data");
  const lockPath = path.join(dataDir, "run", "wikipedia-indexed.lock");
  const port = randomPort();
  let blocker = null;

  try {
    copyFixture(
      "ns0-sample.txt",
      path.join(dataDir, "raw", "enwiki-latest-all-titles.ns0.txt")
    );

    const build = runNode([BUILD_SCRIPT, "--file", "data/raw/enwiki-latest-all-titles.ns0.txt"], {
      cwd: temp,
      env: { ...process.env, WIKIPEDIA_INDEX_DATA_DIR: dataDir },
    });
    assert.equal(build.status, 0, build.stderr || build.stdout);

    blocker = http.createServer((_req, res) => {
      res.statusCode = 200;
      res.end("busy");
    });
    await new Promise((resolve) => blocker.listen(port, "127.0.0.1", resolve));

    const result = runNode([SERVICE_SCRIPT], {
      cwd: temp,
      env: {
        ...process.env,
        WIKIPEDIA_INDEX_DATA_DIR: dataDir,
        SECS_WIKI_INDEX_PORT: `${port}`,
      },
    });

    assert.notEqual(result.status, 0, "service unexpectedly started on occupied port");
    assert.match(result.stderr + result.stdout, /EADDRINUSE|address already in use/i);
    assert.equal(
      fs.existsSync(lockPath),
      false,
      "service lock should be removed when listen() fails"
    );
  } finally {
    if (blocker) {
      await new Promise((resolve) => blocker.close(resolve));
    }
    removeTree(temp);
  }
});
