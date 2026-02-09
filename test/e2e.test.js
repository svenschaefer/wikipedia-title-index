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
  sleep,
  removeTree,
} = require("./test-helpers");

const PROJECT_DIR = path.resolve(__dirname, "..");
const BUILD_SCRIPT = path.join(PROJECT_DIR, "src", "cli", "build.js");
const SERVICE_SCRIPT = path.join(PROJECT_DIR, "src", "server", "wikipedia-indexed.js");

test("end-to-end smoke test with request logging and no SQL leakage", async () => {
  const temp = makeTempWorkspace("e2e");
  const dataDir = path.join(temp, "data");
  const port = randomPort();
  let child = null;
  let stdout = "";

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
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });

    await waitFor(`http://127.0.0.1:${port}/health`);

    const sqlText = "SELECT t FROM titles WHERE t >= ?1 AND t < ?2 ORDER BY t";
    const query = await fetch(`http://127.0.0.1:${port}/v1/titles/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sql: sqlText,
        params: ["Albert", `Albert\uffff`],
        max_rows: 2,
      }),
    });
    assert.equal(query.status, 200);
    const body = await query.json();
    assert.equal(body.row_count, 1);

    const secondQuery = await fetch(`http://127.0.0.1:${port}/v1/titles/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sql: sqlText,
        params: ["Albert", `Albert\uffff`],
        max_rows: 2,
      }),
    });
    assert.equal(secondQuery.status, 200);
    const secondBody = await secondQuery.json();
    assert.deepEqual(secondBody, body);

    const cacheDir = path.join(dataDir, "cache");
    const cacheEntries = listJsonFiles(cacheDir);
    assert.equal(cacheEntries.length, 1);

    await sleep(300);
    assert.match(stdout, /"event":"request"/);
    assert.match(stdout, /"endpoint":"\/v1\/titles\/query"/);
    assert.match(stdout, /"endpoint":"\/v1\/titles\/query".*"cache_hit":false/);
    assert.match(stdout, /"endpoint":"\/v1\/titles\/query".*"cache_hit":true/);
    assert.doesNotMatch(stdout, /SELECT t FROM titles/);
    assert.doesNotMatch(stdout, /Albert\\uffff/);
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

function listJsonFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  walk(root, files);
  return files;
}

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }
}
