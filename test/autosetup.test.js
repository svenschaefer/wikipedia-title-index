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
const SERVICE_SCRIPT = path.join(PROJECT_DIR, "src", "server", "wikipedia-indexed.js");

test("autosetup disabled fails fast when index is missing", () => {
  const temp = makeTempWorkspace("autosetup-off");
  try {
    copyFixture(
      "ns0-sample.txt",
      path.join(temp, "data", "raw", "enwiki-latest-all-titles.ns0.txt")
    );
    const port = randomPort();
    const result = runNode([SERVICE_SCRIPT], {
      cwd: temp,
      env: {
        ...process.env,
        WIKIPEDIA_INDEX_AUTOSETUP: "0",
        WIKIPEDIA_INDEX_DATA_DIR: path.join(temp, "data"),
        SECS_WIKI_INDEX_PORT: `${port}`,
      },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr + result.stdout, /auto-setup is disabled/i);
  } finally {
    removeTree(temp);
  }
});

test("autosetup enabled builds on first run and serves queries", async () => {
  const temp = makeTempWorkspace("autosetup-on");
  const port = randomPort();
  const sourcePort = randomPort();
  let child = null;
  let sourceServer = null;

  try {
    const sourceFile = path.join(
      temp,
      "data",
      "raw",
      "enwiki-latest-all-titles-in-ns0.txt"
    );
    copyFixture("ns0-sample.txt", sourceFile);

    const sourceScript = `
      const http = require("node:http");
      const fs = require("node:fs");
      const filePath = process.argv[1];
      const port = Number(process.argv[2]);
      http.createServer((req, res) => {
        if (req.url === "/enwiki-latest-all-titles-in-ns0.txt") {
          fs.createReadStream(filePath).pipe(res);
          return;
        }
        res.statusCode = 404;
        res.end();
      }).listen(port, "127.0.0.1");
    `;
    sourceServer = startNode(["-e", sourceScript, sourceFile, `${sourcePort}`], {
      cwd: temp,
      env: process.env,
    });
    await sleep(250);

    child = startNode([SERVICE_SCRIPT], {
      cwd: temp,
      env: {
        ...process.env,
        WIKIPEDIA_INDEX_AUTOSETUP: "1",
        WIKIPEDIA_INDEX_DATA_DIR: path.join(temp, "data"),
        WIKIPEDIA_INDEX_SOURCE_URL: `http://127.0.0.1:${sourcePort}/enwiki-latest-all-titles-in-ns0.txt`,
        SECS_WIKI_INDEX_PORT: `${port}`,
      },
    });

    await waitFor(`http://127.0.0.1:${port}/health`);

    const queryResponse = await fetch(`http://127.0.0.1:${port}/v1/titles/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sql: "SELECT t FROM titles WHERE t >= ?1 AND t < ?2 ORDER BY t",
        params: ["Albert", `Albert\uffff`],
        max_rows: 5,
      }),
    });
    assert.equal(queryResponse.status, 200);
    const body = await queryResponse.json();
    assert.ok(body.rows.some((r) => r[0] === "Albert Einstein"));
  } finally {
    if (child) {
      child.kill("SIGTERM");
      await onceExit(child);
    }
    if (sourceServer) {
      sourceServer.kill("SIGTERM");
      await onceExit(sourceServer);
    }
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
