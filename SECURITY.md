# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.x | Yes |
| < 1.0.0 | No |

## Reporting a Vulnerability

Please report security issues privately via GitHub Security Advisories for this repository.

Fallback contact (if advisory flow is unavailable):
- open a private report request via repository owner contact on GitHub: `@svenschaefer`

Include:
- affected version
- reproduction steps
- expected vs actual behavior
- potential impact

Do not post exploit details in public issues before triage.

## Scope

This package provides local build/query tooling and a local HTTP service.
Security issues include:
- SQL policy bypasses
- lock/lifecycle bypasses
- unexpected data exposure through service responses or logs
- dependency compromise or supply-chain tampering
