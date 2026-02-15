# wikipedia-title-index

[![CI](https://github.com/svenschaefer/wikipedia-title-index/actions/workflows/ci.yml/badge.svg)](https://github.com/svenschaefer/wikipedia-title-index/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/svenschaefer/wikipedia-title-index)](https://github.com/svenschaefer/wikipedia-title-index/releases)

Local Wikipedia title index builder and constrained query service.

## Requirements

- Node.js >= 24.10.0
- CommonJS runtime

## What it provides

- Streaming index build from file or URL
- Local SQLite index (`titles(t TEXT PRIMARY KEY)`)
- Local REST query service with SQLite authorizer policy
- CLI for build/serve/title lookup/cache/status/clean

## Install

```bash
npm i wikipedia-title-index
```

## CLI

```bash
npx wikipedia-title-index build [--file <path> | --url <url>]
npx wikipedia-title-index serve
npx wikipedia-title-index query "<title-or-prefix>" [limit]
npx wikipedia-title-index cache clear
npx wikipedia-title-index status
npx wikipedia-title-index clean
```

Installed-package usage:
- Use `npx wikipedia-title-index ...` after `npm i wikipedia-title-index`.
- Plain `wikipedia-title-index ...` works only when installed globally (or when your shell PATH includes local npm bins).

## Query modes (important)

`wikipedia-title-index` has two query surfaces with different capabilities:

| Surface | How to use | Supports raw SQL? | Purpose |
|---|---|---:|---|
| CLI | `npx wikipedia-title-index query "<title-or-prefix>" [limit]` | No | Exact + prefix title lookup only |
| REST API | `POST /v1/titles/query` with JSON `{ sql, params, max_rows }` | Yes | Policy-constrained SQL `SELECT` queries |

Notes:
- The CLI `query` command does **not** accept SQL text.
- SQL policy enforcement (SQLite authorizer) applies to the REST SQL endpoint.

### CLI title lookup example

```bash
npx wikipedia-title-index query "Albert" 5
```

### REST SQL example

Start service:

```bash
npx wikipedia-title-index serve
```

Run SQL query:

```bash
curl -sS -X POST http://127.0.0.1:32123/v1/titles/query \
  -H "content-type: application/json" \
  -d "{\"sql\":\"SELECT t FROM titles WHERE t >= ?1 AND t < ?2 ORDER BY t\",\"params\":[\"Albert\",\"Albert\uffff\"],\"max_rows\":5}"
```

## Environment variables

- `WIKIPEDIA_INDEX_DATA_DIR` (default: `data`)
- `WIKIPEDIA_INDEX_DB_PATH` (override full DB path)
- `WIKIPEDIA_INDEX_SOURCE_URL` (default: `https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-all-titles-in-ns0.gz`)
- `WIKIPEDIA_INDEX_AUTOSETUP` (`0` disables auto-setup)
- `SECS_WIKI_INDEX_PORT` (default: `32123`)
- `WIKIPEDIA_INDEX_CACHE_ENABLED` (`0` disables cache, default: `1`)
- `WIKIPEDIA_INDEX_CACHE_TTL_SECONDS` (default: `86400`, `0` disables TTL pruning)
- `WIKIPEDIA_INDEX_CACHE_MAX_ENTRIES` (default: `10000`, `0` disables size pruning)

Query cache:
- Successful `/v1/titles/query` responses and CLI `query` results are cached in `data/cache/` by request shape.
- Cache keys include DB fingerprint (`path + size + mtime`) to avoid stale reuse after rebuilds.

## REST service

Start:

```bash
npx wikipedia-title-index serve
```

Endpoints:

- `GET /health`
- `POST /v1/titles/query`

`POST /v1/titles/query` request body:
- `sql` (required): SQL `SELECT` statement
- `params` (optional): SQL parameters
- `max_rows` (optional): response row cap (bounded by server limits)

OpenAPI contract: `openapi/openapi.yaml`

## Docs

- Operations: `docs/OPS.md`
- Package contract: `docs/NPM.md`
- Maintenance runbook: `MAINTENANCE.md`
- Migration notes: `MIGRATION.md`
- Guarantees: `docs/GUARANTEES.md`
- Developer tooling (non-public): `docs/DEV_TOOLING.md`
- Repo workflows: `docs/REPO_WORKFLOWS.md`
- Baseline test run: `docs/BASELINE_TEST_RUN.md`
- Release process index (docs): `docs/NPM_RELEASE.md`
- Release notes template: `docs/RELEASE_NOTES_TEMPLATE.md`
- Agent behavior contract: `docs/AGENT.md`

## Development Checks

```bash
npm test
npm run lint:openapi
npm run pre-commit-check
npm run ci:check
npm run smoke:pack
```

## Known Limitations

- Service transport is HTTP on localhost by default (no built-in TLS termination).
- First run can be slow due to index bootstrap/download/build.
- Local data footprint can be large (SQLite index plus optional cache files).
- CLI `query` supports title/prefix lookup only; raw SQL is REST-only via `POST /v1/titles/query`.

## Data and licensing

Wikipedia title data is subject to Creative Commons Attribution-ShareAlike (CC BY-SA).
This package does not alter, reinterpret, or relicense the underlying data.
When redistributing derived outputs, ensure attribution and license obligations are met for the underlying Wikipedia data.

## Notes

- `data/` artifacts are local runtime/build output and are not part of npm publish.
- SQL access is constrained to read-only `SELECT` on `main.titles.t`.
- Lock behavior (`v1.0.1+`): lock files are validated by recorded PID liveness. Stale locks are auto-removed; live locks block concurrent start.
