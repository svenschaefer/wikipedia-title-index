# Developer Tooling (Non-Public)

This document describes repository development tooling only.  
It is not part of the package compatibility contract.

## Scope

These scripts are for local quality checks and CI hygiene:

- `npm test`
- `npm run lint:openapi`
- `npm run pre-commit-check`
- `npm run ci:check`
- `npm run smoke:pack`
- `npm run release-check`
- `npm run release:check`

Optional local pre-commit hook:

```bash
npm run pre-commit-check
```

## Contract Boundary

Public/stable interfaces are the package exports in `package.json`,
documented CLI commands, and documented REST API endpoints.

Development scripts are internal workflow tooling and may evolve
between releases without a breaking-change implication.
