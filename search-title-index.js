const { DatabaseSync } = require("node:sqlite");
const { getConfig } = require("./lib/paths");

const DEFAULT_LIMIT = 25;

function printUsage() {
  console.log("Usage: node search-title-index.js <query> [limit]");
  console.log("Examples:");
  console.log('  node search-title-index.js "Albert Einstein"');
  console.log('  node search-title-index.js "Albert" 50');
}

function main() {
  const rawQuery = process.argv[2]?.trim();
  const query = rawQuery?.replaceAll("_", " ");
  const limitArg = Number.parseInt(process.argv[3] ?? `${DEFAULT_LIMIT}`, 10);
  const limit =
    Number.isFinite(limitArg) && limitArg > 0 ? limitArg : DEFAULT_LIMIT;

  if (!query) {
    printUsage();
    process.exit(1);
  }

  const config = getConfig();
  const db = new DatabaseSync(config.dbPath, { readOnly: true });

  try {
    const exact = db
      .prepare("SELECT t FROM titles WHERE t = ? LIMIT 1")
      .get(query);
    const prefixRows = db
      .prepare(
        "SELECT t FROM titles WHERE t >= ? AND t < ? ORDER BY t LIMIT ?"
      )
      .all(query, `${query}\uffff`, limit);
    const displayedPrefixRows = exact
      ? prefixRows.filter((row) => row.t !== exact.t)
      : prefixRows;

    if (!exact && displayedPrefixRows.length === 0) {
      console.log("No matches");
      return;
    }

    if (exact) {
      console.log("Exact match:");
      console.log(exact.t);
    }

    if (displayedPrefixRows.length > 0) {
      console.log(`Prefix matches (${displayedPrefixRows.length}):`);
      for (const row of displayedPrefixRows) {
        console.log(row.t);
      }
    }
  } finally {
    db.close();
  }
}

if (require.main === module) {
  main();
}
