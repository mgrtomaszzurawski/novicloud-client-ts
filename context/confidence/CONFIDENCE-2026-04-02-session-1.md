# Confidence Assessment: Session 1

**Date:** 2026-04-02
**Assessor:** Claude (automated)
**Scope:** All code written in session 1

---

## Component confidence

| Component | Confidence | Tested | Notes |
|-----------|:----------:|:------:|-------|
| **errors.ts** | HIGH | Yes (12 tests) | Direct port of Java logic. All 5 classes, factory, Retry-After parsing. Well-tested. |
| **retry.ts** | HIGH | Yes (10 tests) | Direct port. Exponential/fixed backoff, jitter, 429/5xx handling. Tested edge cases. |
| **paging.ts** | MEDIUM | Yes (13 tests) | Complex logic. Unit tested with mocks but not integration tested. Bidirectional iteration and page boundary crossing not verified against real server. |
| **query-types.ts** | HIGH | No (type-only) | Verified against generated interfaces. Broken params from ADR-031 correctly excluded. |
| **resource-helpers.ts** | HIGH | Yes (13 tests) | Simple functions, fully tested. |
| **resources.ts** | LOW | Partial (1/18) | Only TowaryClient has integration test. 17 clients untested. Property name mapping verified at compile time but not at runtime. Biggest risk: wrong query param names, missing/extra params, incorrect API method calls. |
| **client.ts** | MEDIUM | Yes (lifecycle) | Constructor, close(), ensureOpen() tested. Auth header tested via MSW integration test. Not tested: custom baseUrl, retryPolicy overrides. |
| **paging link fetcher** | LOW | No | `fetchLink()` in resources.ts manually constructs fetch with auth. Not tested at all. Might have issues with: URL construction, header format, error handling, JSON deserialization. |
| **demo/demo.ts** | LOW | No | Written but never executed. Will likely fail on first run. |
| **OpenAPI generation** | HIGH | N/A | Used same generator as Java SDK. Output verified by TypeScript compiler. |
| **Build (tsup)** | HIGH | Yes | ESM + CJS + DTS all produced successfully. |

---

## Risk areas

### Critical (must verify before any release)
1. **17 untested resource clients** - wrong property names would cause silent data loss or runtime errors
2. **Pagination link fetcher** - untested; handles auth, URL construction, error mapping
3. **Demo app** - never executed

### Medium
4. **PagedResult page boundary crossing** - unit tested with mocks but real server behavior may differ
5. **Date handling** - generated code uses `new Date()` for `ost_zmiana`; Java needed custom `FlexibleLocalDateTimeDeserializer` for mixed formats. TS may need similar handling.
6. **Generated enum compatibility** - using generated enums directly; Java had SDK-owned enums

### Low
7. **RapSprzed/RapPracy grupowanie** - cast to `unknown` to pass string literal to generated enum type. Works but fragile.
8. **StanyMag special methods** - listByTowar(), getByTowarAndSklep() written from API signatures but not tested

---

## Verification plan

To move from LOW/MEDIUM to HIGH confidence:

1. **Run tests** (`npm test`) - immediate, will reveal compilation/runtime issues
2. **Add integration tests** for all 18 endpoints - same pattern as towary.test.ts
3. **Run demo against live server** - exercises real HTTP, auth, pagination, serialization
4. **Compare API calls** with Java SDK - use network capture to verify identical request/response handling
5. **Test date deserialization** - verify `ost_zmiana` and similar fields parse correctly
