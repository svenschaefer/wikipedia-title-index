# Contributing

## Requirements

- Node.js >= 24.10.0
- npm

## Setup

```bash
npm ci
```

## Validate Before PR

```bash
npm test
npm run lint:openapi
```

## Pull Requests

- Keep changes scoped and reviewable.
- Update docs when behavior or contracts change.
- Preserve backward compatibility for public API and CLI unless coordinated for a major release.

## Commit Messages

Use concise conventional-style subjects:

- `feat: ...`
- `fix: ...`
- `docs: ...`
- `test: ...`
- `chore: ...`

Guidelines:
- Keep subject line imperative and specific.
- Mention migration/operator impact in the body when relevant.

## PR Checklist

- [ ] Scope is focused and reviewable.
- [ ] Tests added/updated for behavior changes.
- [ ] `npm test` passed locally.
- [ ] `npm run lint:openapi` passed locally.
- [ ] Docs updated where contracts/operations changed.
