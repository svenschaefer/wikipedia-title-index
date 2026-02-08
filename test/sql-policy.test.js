const test = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const {
  validateQueryRequest,
  createAuthorizer,
} = require("../src/lib/sql-policy");
const { getConfig } = require("../src/lib/paths");

test("validateQueryRequest rejects non-select and multi-statement", () => {
  const config = getConfig();
  assert.throws(
    () => validateQueryRequest("DELETE FROM titles", [], config),
    /Only SELECT/
  );
  assert.throws(
    () => validateQueryRequest("SELECT 1; SELECT 2", [], config),
    /single SQL statement/
  );
});

test("authorizer allows read from titles and rejects sqlite_master", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE titles (t TEXT PRIMARY KEY)");
  db.exec("INSERT INTO titles (t) VALUES ('Albert')");
  db.setAuthorizer(createAuthorizer());

  const rows = db.prepare("SELECT t FROM titles").all();
  assert.equal(rows.length, 1);

  assert.throws(
    () => db.prepare("SELECT name FROM sqlite_master").all(),
    /prohibited|not authorized/
  );
  db.close();
});
