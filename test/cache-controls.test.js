const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
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
const CLI_BIN = path.join(PROJECT_DIR, "bin", "wikipedia-title-index.js");
const SERVICE_SCRIPT = path.join(PROJECT_DIR, "src", "server", "wikipedia-indexed.js");

test("cache clear command removes cache entries", () => {
  const temp = makeTempWorkspace("cache-clear-cli");
  try {
    const dataDir = path.join(temp, "data");
    const cacheDir = path.join(dataDir, "cache");
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(path.join(cacheDir, "a.json"), "{}");
    fs.writeFileSync(path.join(cacheDir, "b.json"), "{}");

    const result = runNode([CLI_BIN, "cache", "clear"], {
      cwd: temp,
      env: {
        ...process.env,
        WIKIPEDIA_INDEX_DATA_DIR: dataDir,
      },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Cleared 2 cache entries/);
    const remaining = fs.readdirSync(cacheDir).filter((name) => name.endsWith(".json"));
    assert.equal(remaining.length, 0);
  } finally {
    removeTree(temp);
  }
});

test("server does not read or write cache when cache is disabled", async () => {
  const temp = makeTempWorkspace("cache-disabled-server");
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
        WIKIPEDIA_INDEX_CACHE_ENABLED: "0",
        SECS_WIKI_INDEX_PORT: `${port}`,
      },
    });
    await waitFor(`http://127.0.0.1:${port}/health`);
    const payload = {
      sql: "SELECT t FROM titles WHERE t >= ?1 AND t < ?2 ORDER BY t",
      params: ["Albert", `Albert\uffff`],
      max_rows: 2,
    };
    const first = await fetch(`http://127.0.0.1:${port}/v1/titles/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    assert.equal(first.status, 200);
    const second = await fetch(`http://127.0.0.1:${port}/v1/titles/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    assert.equal(second.status, 200);
    assert.deepEqual(await second.json(), await first.clone().json());

    const cacheDir = path.join(dataDir, "cache");
    assert.equal(fs.existsSync(cacheDir), false);
  } finally {
    if (child) {
      child.kill("SIGTERM");
      await onceExit(child);
    }
    removeTree(temp);
  }
});

test("cli query does not write cache when cache is disabled", () => {
  const temp = makeTempWorkspace("cache-disabled-cli");
  const dataDir = path.join(temp, "data");
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

    const first = runNode([CLI_BIN, "query", "Albert", "5"], {
      cwd: temp,
      env: {
        ...process.env,
        WIKIPEDIA_INDEX_DATA_DIR: dataDir,
        WIKIPEDIA_INDEX_CACHE_ENABLED: "0",
      },
    });
    assert.equal(first.status, 0, first.stderr || first.stdout);

    const second = runNode([CLI_BIN, "query", "Albert", "5"], {
      cwd: temp,
      env: {
        ...process.env,
        WIKIPEDIA_INDEX_DATA_DIR: dataDir,
        WIKIPEDIA_INDEX_CACHE_ENABLED: "0",
      },
    });
    assert.equal(second.status, 0, second.stderr || second.stdout);

    const cacheDir = path.join(dataDir, "cache");
    assert.equal(fs.existsSync(cacheDir), false);
  } finally {
    removeTree(temp);
  }
});

function onceExit(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null) {
      resolve();
      return;
    }
    child.once("exit", resolve);
  });
}
