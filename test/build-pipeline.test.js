const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const {
  makeTempWorkspace,
  copyFixture,
  gzipFile,
  runNode,
  startNode,
  randomPort,
  sleep,
  removeTree,
} = require("./test-helpers");

const PROJECT_DIR = path.resolve(__dirname, "..");
const BUILD_SCRIPT = path.join(PROJECT_DIR, "src", "cli", "build.js");

test("build pipeline supports local ns0 gzip, all-titles filtering, and URL gzip", async () => {
  const temp = makeTempWorkspace("build");
  const dataDir = path.join(temp, "data");
  const rawDir = path.join(dataDir, "raw");
  const indexDbPath = path.join(dataDir, "index", "titles.db");
  let server = null;

  try {
    const ns0Txt = path.join(rawDir, "enwiki-latest-all-titles-in-ns0.txt");
    copyFixture("ns0-sample.txt", ns0Txt);
    const ns0Gz = path.join(rawDir, "enwiki-latest-all-titles-in-ns0.gz");
    gzipFile(ns0Txt, ns0Gz);

    let result = runNode([BUILD_SCRIPT, "--file", ns0Gz], {
      cwd: temp,
      env: { ...process.env, WIKIPEDIA_INDEX_DATA_DIR: dataDir },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.deepEqual(readTitles(indexDbPath), [
      "Albert Einstein",
      "Algebra",
      "Alpha Title",
      "Zulu Title",
    ]);

    const allTxt = path.join(rawDir, "enwiki-latest-all-titles.txt");
    copyFixture("all-titles-sample.txt", allTxt);
    const allGz = path.join(rawDir, "enwiki-latest-all-titles.gz");
    gzipFile(allTxt, allGz);

    result = runNode([BUILD_SCRIPT, "--file", allGz], {
      cwd: temp,
      env: { ...process.env, WIKIPEDIA_INDEX_DATA_DIR: dataDir },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.deepEqual(readTitles(indexDbPath), ["Alpha Title", "Beta Title"]);

    const port = randomPort();
    const serverScript = `
      const http = require("node:http");
      const fs = require("node:fs");
      const filePath = process.argv[1];
      const port = Number(process.argv[2]);
      http.createServer((req, res) => {
        if (req.url === "/enwiki-latest-all-titles.gz") {
          fs.createReadStream(filePath).pipe(res);
          return;
        }
        res.statusCode = 404;
        res.end();
      }).listen(port, "127.0.0.1");
    `;
    server = startNode(["-e", serverScript, allGz, `${port}`], {
      cwd: temp,
      env: process.env,
    });
    await sleep(250);
    try {
      result = runNode(
        [
          BUILD_SCRIPT,
          "--url",
          `http://127.0.0.1:${port}/enwiki-latest-all-titles.gz`,
        ],
        {
          cwd: temp,
          env: { ...process.env, WIKIPEDIA_INDEX_DATA_DIR: dataDir },
          timeout: 300_000,
        }
      );
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.deepEqual(readTitles(indexDbPath), ["Alpha Title", "Beta Title"]);
    } finally {
      if (server) {
        server.kill("SIGTERM");
        await onceExit(server);
      }
    }
  } finally {
    removeTree(temp);
  }
});

function readTitles(dbPath) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    return db.prepare("SELECT t FROM titles ORDER BY t").all().map((r) => r.t);
  } finally {
    db.close();
  }
}

function onceExit(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null) {
      resolve();
      return;
    }
    child.once("exit", () => resolve());
  });
}
