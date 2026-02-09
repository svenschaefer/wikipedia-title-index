# wikipedia-title-index

Local Wikipedia title index builder and constrained query service.

## Requirements

- Node.js >= 24.10.0
- CommonJS runtime

## What it provides

- Streaming index build from file or URL
- Local SQLite index (`titles(t TEXT PRIMARY KEY)`)
- Local REST query service with SQLite authorizer policy
- CLI for build/serve/query/status/clean

## Install

```bash
npm i wikipedia-title-index
```

## CLI

```bash
wikipedia-title-index build [--file <path> | --url <url>]
wikipedia-title-index serve
wikipedia-title-index query "<title-or-prefix>" [limit]
wikipedia-title-index cache clear
wikipedia-title-index status
wikipedia-title-index clean
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

OpenAPI contract: `openapi/openapi.yaml`

## Docs

- Operations: `docs/OPS.md`
- Package contract: `docs/NPM.md`
- Agent behavior contract: `docs/AGENT.md`

## Data and licensing

Wikipedia title data is subject to Creative Commons Attribution-ShareAlike (CC BY-SA).
This package does not alter, reinterpret, or relicense the underlying data.

## Notes

- `data/` artifacts are local runtime/build output and are not part of npm publish.
- SQL access is constrained to read-only `SELECT` on `main.titles.t`.
- Lock behavior (`v1.0.1+`): lock files are validated by recorded PID liveness. Stale locks are auto-removed; live locks block concurrent start.
