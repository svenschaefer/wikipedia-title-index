# Migration Notes

This file captures non-breaking but operationally relevant upgrade notes.

## 1.2.4 -> 1.2.6

### Cache format transition

- `1.2.4` introduced a bucket-based cache storage format and temporary migration logic.
- `1.2.6` removed legacy cache migration paths and supports only the current sharded bucket format.

### Operator action

When upgrading from versions that may contain legacy cache entries, clear cache once:

```bash
npx wikipedia-title-index cache clear
```

Equivalent manual cleanup:

- delete `${WIKIPEDIA_INDEX_DATA_DIR}/cache/`

### Runtime impact

- No public API or CLI behavior change beyond cache internals.
- Cache misses may temporarily increase immediately after clearing cache.
