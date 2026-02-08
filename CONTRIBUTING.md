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
npx @redocly/cli lint openapi/openapi.yaml
```

## Pull Requests

- Keep changes scoped and reviewable.
- Update docs when behavior or contracts change.
- Preserve backward compatibility for public API and CLI unless coordinated for a major release.
