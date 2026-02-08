const { DatabaseSync } = require("node:sqlite");
const { getConfig } = require("../lib/paths");

const DEFAULT_LIMIT = 25;

function printUsage() {
  console.log("Usage: wikipedia-title-index query <query> [limit]");
  console.log("Examples:");
  console.log('  wikipedia-title-index query "Albert Einstein"');
  console.log('  wikipedia-title-index query "Albert" 50');
}

function main(argv = process.argv.slice(2)) {
  const rawQuery = argv[0]?.trim();
  const query = rawQuery?.replaceAll("_", " ");
  const limitArg = Number.parseInt(argv[1] ?? `${DEFAULT_LIMIT}`, 10);
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

module.exports = {
  main,
};
