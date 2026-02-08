# Changelog

All notable changes to this project are documented in this file.

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
