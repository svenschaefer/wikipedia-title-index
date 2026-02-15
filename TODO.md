# TODO

## Security Triage (Snyk)

| ID | Finding | Location | Severity | Status | Decision | Revisit Trigger | Notes |
|---|---|---|---|---|---|---|---|
| SEC-001 | Cleartext Transmission - HTTP Instead of HTTPS (CWE-319) | `src/server/wikipedia-indexed.js` | Medium | Open | Accepted risk (localhost-only) | Before any non-local exposure (LAN/container publish/reverse proxy/cloud) | Current design is local loopback HTTP. Add TLS termination (reverse proxy or native HTTPS) for external access. |
| SEC-002 | Information Exposure - Server Error Message (CWE-200) | `src/server/wikipedia-indexed.js` | Medium | Open | Accepted risk (local-only hardening backlog) | Before any non-local exposure | Current 5xx path may return raw `error.message`. Future fix: keep detailed errors in logs, return generic client 5xx message. |
| SEC-003 | Cleartext Transmission - HTTP Instead of HTTPS (CWE-319) | `test/listen-failure.test.js` | Low | Closed | False positive / test-only | N/A | Test code intentionally uses HTTP server primitives; no production surface. |

## Next Hardening Batch

- [ ] Replace client-facing unknown 5xx error text with a generic message in `src/server/wikipedia-indexed.js`.
- [ ] Document explicit deployment rule: service must remain localhost-only unless TLS termination is configured.
- [ ] If remote access is needed, add HTTPS/TLS path and update docs/tests accordingly.
