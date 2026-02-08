# NPM.md — Wikipedia Titles Index (npm package)

This document defines the **final concept and contract** for the npm package
that provides a local Wikipedia titles index.

The package is **standalone** and **generic**.
It provides infrastructure only.

---

## 1. Package Purpose

The package provides:

- a local SQLite index of **English Wikipedia page titles**
- data sourced directly from **official Wikimedia dumps**
- a fully streaming build pipeline
- automatic provisioning on first use
- local querying via REST service and CLI

The package is intended as **developer infrastructure**, not as a data bundle.

---

## 2. Package Naming

The package name MUST explicitly reference **Wikipedia**.

Canonical package name:

- `wikipedia-title-index`

The package name MUST NOT:
- imply bundled Wikipedia data
- imply affiliation with Wikimedia

---

## 3. What the Package Ships

The npm tarball contains **code only**:

- build CLI
- REST service
- streaming ingestion pipeline
- SQLite schema and authorizer logic
- documentation

The package **MUST NOT ship any Wikipedia data**.

All Wikipedia data is fetched on demand from default official Wikimedia endpoints.

Runtime constraints:

- Node.js `>= 24.10.0`
- CommonJS package/runtime (no dual publish for v1)
- Mandatory platform support: Windows, Linux, macOS

---

## 4. Data Source

Default data source (example):

https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-all-titles-in-ns0.gz

Characteristics:

- gzip-compressed
- line-based
- one title per line
- official Wikimedia infrastructure

Alternative sources MAY be supported via configuration.

---

## 5. Provisioning Model (Auto-Setup on First Use)

### Core Principle

**Installation installs code only.  
Data provisioning happens on first use.**

The package MUST NOT download data or build databases during `npm install`.

---

### First-Run Behavior

On the first invocation of a command that requires the index
(e.g. `serve`, `query`):

1. Check for an existing, compatible index:
   - SQLite DB exists
   - metadata exists
   - schema/version compatible

2. If valid:
   - proceed normally

3. If missing or incompatible:
   - automatically run the build pipeline (only when auto-setup is enabled):
     - streaming download
     - streaming decompression
     - normalization
     - SQLite index creation

Auto-setup is **deterministic and idempotent**.

---

## 6. Explicit Control and Opt-Out

Auto-setup MUST be controllable.

Supported controls:

- `WIKIPEDIA_INDEX_AUTOSETUP=0`
  - disables auto-setup
  - commands fail fast if the index is missing

- `WIKIPEDIA_INDEX_DATA_DIR`
  - overrides the default data location

- `WIKIPEDIA_INDEX_SOURCE_URL`
  - overrides the default dump URL

The package MUST NEVER perform provisioning implicitly outside these rules.

Lifecycle-script constraint:

- No `postinstall`/install-time data download or index build side effects.

---

## 7. Build Pipeline Characteristics

The build pipeline MUST be:

- fully streaming
- memory-bounded (batch-only)
- free of intermediate uncompressed dump files
- transactional at the database level
- safe against partial failure

Pipeline shape:

```

HTTP/file stream
→ gzip inflate
→ line parser
→ normalize (_ → space)
→ batch insert
→ atomic commit

```

Only the resulting SQLite database is persisted.

---

## 8. Metadata and Idempotence

After a successful build, the package MUST write metadata:

```
metadata.json
```

Required fields:

```json
{
  "source_url": "...",
  "source_type": "all-titles-in-ns0",
  "built_at": "...",
  "package_version": "...",
  "schema_version": "...",
  "row_count": 12345678
}
```

Metadata is authoritative for:

* deciding whether auto-setup is required
* debugging and reproducibility

---

## 9. CLI Surface (Conceptual)

The package SHOULD expose a minimal CLI:

```bash
wikipedia-index build
wikipedia-index serve
wikipedia-index status
wikipedia-index clean
```

Behavior:

* `build`
  Always performs an explicit rebuild.

* `serve`
  Starts the local service and triggers auto-setup if required.

* `status`
  Reports index and metadata status.

* `clean`
  Removes local data and metadata.

Public API surface policy:

- Export only documented entry points via strict `package.json.exports`.
- Undocumented internal paths are not part of the compatibility contract.

---

## 10. Licensing and Attribution

* Wikipedia dumps are licensed under **CC BY-SA**
* The package MUST:

  * not bundle Wikipedia data
  * clearly document the data source
  * document the applicable Wikipedia license

The npm package license applies **only to the code**, not to downloaded data.

---

## 11. Operational Characteristics

The package guarantees:

* single build at a time
* single running service instance
* local-only network binding
* deterministic behavior
* explicit failure modes

The package intentionally avoids:

* background updates
* silent retries
* hidden state
* implicit authority escalation

Error-contract stability (SemVer):

- Stable envelope: `error.code`, `error.message`, optional `requestId`.
- `error.details` MAY gain additive fields without a major version bump.
- Major bump is required for removed/renamed required fields, or `code`/HTTP status remaps.

Storage-engine contract note:

- SQLite is part of the v1 contract; storage-engine changes require a major version bump.

---

## 12. Non-Goals

The package explicitly does NOT aim to:

* expose full Wikipedia content
* provide search ranking or relevance
* perform semantic analysis
* act as a public or hosted API
* manage automatic updates

---

## 13. Summary

This npm package provides:

> **Wikipedia titles as local infrastructure, provisioned on demand.**

It enforces a strict separation between:

* code and data
* install and provisioning
* open querying and limited authority

That separation is deliberate and final.

---

## 14. Release and Supply Chain Policy

- Initial release mode: manual publish
- npm 2FA: required
- npm provenance/OIDC: enabled when automated release is introduced
- Lockfile: committed
- Security policy file (`SECURITY.md`): required
