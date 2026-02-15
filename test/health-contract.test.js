const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  makeTempWorkspace,
  copyFixture,
  runNode,
  startNode,
  randomPort,
  waitFor,
  removeTree,
} = require("./test-helpers");

const PROJECT_DIR = path.resolve(__dirname, "..");
const BUILD_SCRIPT = path.join(PROJECT_DIR, "src", "cli", "build.js");
const SERVICE_SCRIPT = path.join(PROJECT_DIR, "src", "server", "wikipedia-indexed.js");

test("health endpoint returns stable core fields", async () => {
  const temp = makeTempWorkspace("health-contract");
  const dataDir = path.join(temp, "data");
  const port = randomPort();
  let child = null;

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

    child = startNode([SERVICE_SCRIPT], {
      cwd: temp,
      env: {
        ...process.env,
        WIKIPEDIA_INDEX_DATA_DIR: dataDir,
        SECS_WIKI_INDEX_PORT: `${port}`,
      },
    });

    await waitFor(`http://127.0.0.1:${port}/health`);
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(response.status, 200);
    const body = await response.json();

    assert.equal(body.status, "ok");
    assert.equal(typeof body.api_version, "string");
    assert.equal(typeof body.db_path, "string");
    assert.equal(typeof body.db_size_bytes, "number");
    assert.equal(typeof body.db_mtime, "string");
    assert.ok(body.db_size_bytes > 0);
    assert.ok(!Number.isNaN(Date.parse(body.db_mtime)));
  } finally {
    if (child) {
      child.kill("SIGTERM");
      await onceExit(child);
    }
    removeTree(temp);
  }
});

function onceExit(child) {
  return new Promise((resolve) => child.once("exit", resolve));
}
