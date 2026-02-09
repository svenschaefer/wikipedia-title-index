# Changelog

All notable changes to this project are documented in this file.

## [1.2.1] - 2026-02-09

### Changed
- Clarified documentation for query capabilities:
  - CLI `query` is title/prefix lookup only (no raw SQL input).
  - REST `POST /v1/titles/query` is the SQL query surface with policy constraints.
- Added explicit CLI vs REST query examples to reduce ambiguity on npm package page.

## [1.2.0] - 2026-02-09

### Added
- Query result cache layer under `data/cache/` for REST (`POST /v1/titles/query`) and CLI (`query`) flows.
- Cache controls: `WIKIPEDIA_INDEX_CACHE_ENABLED`, `WIKIPEDIA_INDEX_CACHE_TTL_SECONDS`, and `WIKIPEDIA_INDEX_CACHE_MAX_ENTRIES`.
- Cache maintenance command: `wikipedia-title-index cache clear`.
- Cache-focused test coverage for hit/miss, corruption fallback, DB fingerprint invalidation, disabled mode, TTL pruning, and eviction.

### Changed
- Runtime status output now includes cache configuration fields.
- OpenAPI linting now runs through a wrapper to tolerate a known Windows Redocly assertion that can occur after successful validation.

## [1.1.0] - 2026-02-08

### Changed
- Finalized v1.1 repository structure (`src/`, `test/`, `docs/`, `types/`, `openapi/`) and removed root compatibility shims.
- Aligned package exports/bin/docs with the new structure while keeping runtime behavior unchanged.

## [1.0.2] - 2026-02-08

### Fixed
- README install instruction now uses `npm i wikipedia-title-index`.
- README REST start instruction now uses `npx wikipedia-title-index serve` for installed-package usage.

## [1.0.1] - 2026-02-08

### Changed
- Default build/auto-setup source now points to the Wikimedia `all-titles-in-ns0` dump URL when no source is provided.
- Lock handling now distinguishes live vs stale lock files by PID liveness.
- Service startup now guarantees cleanup if `listen()` fails after lock acquisition.
- Tests updated to remain offline-safe under the new remote default-source behavior.

## [1.0.0] - 2026-02-08

### Added
- Initial standalone `wikipedia-title-index` npm package.
- Build, query, serve, status, and clean CLI commands.
- SQL policy enforcement for query endpoint.
- OpenAPI specification and linting.
- Test suite for core behavior.
- Security policy and operational docs.


