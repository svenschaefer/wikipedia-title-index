# Changelog

All notable changes to this project are documented in this file.

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


