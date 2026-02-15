const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("docs reference core npm scripts and release template", () => {
  const pkg = JSON.parse(read("package.json"));
  const readme = read("README.md");
  const releaseDoc = read("NPM_RELEASE.md");

  assert.ok(pkg.scripts["ci:check"], "package.json must define ci:check");
  assert.ok(pkg.scripts["release-check"], "package.json must define release-check");
  assert.ok(pkg.scripts["release:check"], "package.json must define release:check");

  assert.match(readme, /npm run lint:openapi/, "README should mention lint:openapi");
  assert.match(
    releaseDoc,
    /docs\/RELEASE_NOTES_TEMPLATE\.md/,
    "NPM_RELEASE.md should reference release notes template"
  );
});

test("new baseline docs and templates exist", () => {
  const requiredFiles = [
    ".github/dependabot.yml",
    ".github/CODEOWNERS",
    ".github/pull_request_template.md",
    ".github/ISSUE_TEMPLATE/bug_report.md",
    ".github/ISSUE_TEMPLATE/feature_request.md",
    "docs/RELEASE_NOTES_TEMPLATE.md",
    "docs/DEV_TOOLING.md",
    "docs/GUARANTEES.md",
  ];

  for (const relativePath of requiredFiles) {
    const absolutePath = path.join(__dirname, "..", relativePath);
    assert.ok(fs.existsSync(absolutePath), `Missing required file: ${relativePath}`);
  }
});
