# NoviCloud TypeScript SDK - Architecture Reference

**Date:** 2026-04-02
**Status:** Initial (v1.0.0-dev, first session)
**Runtime:** Node.js 18+, TypeScript 6.x

---

## Project structure

```
novicloud-client-ts/
  openapi/                      <- copied from Java SDK, source of truth, DO NOT edit
    openapi.yaml                <- modular spec entry point
    paths/                      <- endpoint definitions (18 files)
    components/schemas/         <- model definitions
    components/parameters/      <- query parameter definitions
    templates/                  <- custom mustache templates
  src/
    generated/                  <- OpenAPI Generator output (typescript-fetch), DO NOT edit
      src/apis/                 <- 18 generated API classes (TowaryApi, AsortyApi, etc.)
      src/models/               <- generated model interfaces + FromJSON/ToJSON
      src/runtime.ts            <- Configuration, BaseAPI, ResponseError, FetchError
    errors.ts                   <- error hierarchy (5 classes), HTTP status mapping
    retry.ts                    <- RetryHandler + RetryPolicy, exponential/fixed backoff + jitter
    paging.ts                   <- PagedResult<T>, AsyncIterable, seek/fetchFrom/bidirectional
    query-types.ts              <- per-endpoint typed query interfaces (broken params excluded)
    resource-helpers.ts         <- extractDane, extractSelfLink, requireNotNull, toLink
    resources.ts                <- 18 resource client classes
    client.ts                   <- NoviCloudClient entry point (Basic Auth, AutoCloseable)
    index.ts                    <- public API exports
  test/
    errors.test.ts              <- error hierarchy, HTTP status mapping, instanceof
    retry.test.ts               <- RetryPolicy validation, retry behavior
    paging.test.ts              <- PagedResult unit tests
    resource-helpers.test.ts    <- extractor and guard helpers
    integration/
      towary.test.ts            <- MSW integration test for towary endpoint
    fixtures/                   <- JSON response fixtures
  demo/
    demo.ts                     <- exercises all 18 endpoints (READ_ONLY mode)
    tsconfig.json               <- demo-specific TS config
  context/
    ARCHITECTURE.md             <- this file
    reports/                    <- session work reports
    confidence/                 <- confidence assessments per component
  dist/                         <- build output (ESM + CJS + DTS), gitignored
  package.json                  <- npm package config, dual ESM/CJS exports
  tsconfig.json                 <- strict TypeScript config
  tsup.config.ts                <- bundler config (ESM + CJS + DTS)
  vitest.config.ts              <- test runner config
  CLAUDE.md                     <- agent instructions (needs rewrite)
  .gitignore
```

---

## Build and verify

```bash
# Generate TypeScript client from OpenAPI spec (requires Java for openapi-generator-cli)
npm run generate

# Build SDK (ESM + CJS + type declarations)
npm run build

# Run all tests
npm test

# Type check (strict, excludes generated code)
npm run lint

# Run demo app (requires live API credentials)
NOVICLOUD_ACCOUNT=xxx NOVICLOUD_PASSWORD=yyy npm run demo
```

---

## Two-layer pattern: generated code + hand-written overlay

Same pattern as the Java SDK (ADR-005):

```
OpenAPI spec (openapi/openapi.yaml)
        |
        v  [openapi-generator-cli, typescript-fetch]
Generated code (src/generated/)
  - 18 API classes with typed methods
  - Model interfaces with FromJSON/ToJSON
  - Runtime: Configuration, BaseAPI, fetch, Basic Auth
  - ResponseError / FetchError for error handling
        |
        v  [hand-written overlay]
SDK overlay (src/*.ts)
  - RetryHandler: 429/5xx retry with backoff + jitter
  - PagedResult: lazy async pagination with seek/fetchFrom
  - Error hierarchy: 5 typed error classes
  - 18 resource clients: typed queries, broken param exclusion
  - NoviCloudClient: entry point, auth, lifecycle
```

Key difference from Java: TypeScript does not need builders (plain objects), model records
(generated types are already interfaces), or Link unwrapping (generated `Link.id` is already
a string).

---

## SDK pattern (per endpoint)

Each of the 18 endpoints has:

| Component | Location | Description |
|-----------|----------|-------------|
| Generated API | `src/generated/src/apis/*Api.ts` | HTTP methods, auth, serialization |
| Generated Models | `src/generated/src/models/*.ts` | TypeScript interfaces + FromJSON |
| Query Type | `src/query-types.ts` | Typed filter params (broken params excluded per ADR-031) |
| Resource Client | `src/resources.ts` | list/count/getById/create/update/deleteById |

Shared infrastructure:

| Module | Description |
|--------|-------------|
| `RetryHandler` | Wraps API calls with configurable retry (429 + 5xx) |
| `PagedResult<T>` | Return type of all `list()` methods; AsyncIterable + seek/fetchFrom |
| `NoviCloudError.of()` | Factory mapping HTTP status to typed error subclass |
| `fetchLink()` | Follows absolute pagination URLs with auth headers |

---

## Endpoint reference

### Operations matrix

| # | Endpoint | list | count | getById | create | update | delete | Delete type | Special |
|---|----------|:----:|:-----:|:-------:|:------:|:------:|:------:|-------------|---------|
| 1 | asorty | x | x | x | x | x | x | hard | |
| 2 | jmiary | x | x | x | x | x | x | hard | |
| 3 | stawkivat | x | x | x | x | - | x | hard | No update (ADR-022) |
| 4 | kraje | x | x | x | x | x | x | hard | |
| 5 | towary | x | x | x | x | x | x | soft (aktywny) | |
| 6 | waluty | x | x | x | x | x | x | soft (aktywny) | |
| 7 | kontrahenci | x | x | x | x | x | x | soft (aktywny) | |
| 8 | sklepy | x | x | x | x | x | x | soft (aktywny) | |
| 9 | formyplatn | x | x | x | x | x | x | soft (aktywny) | |
| 10 | kartyloj | x | x | - | x | x | - | soft (uniewazniono) | getByKod() |
| 11 | stanymag | x | x | - | - | x | - | N/A | listByTowar(), getByTowarAndSklep() |
| 12 | dokumenty | x | x | x | - | - | - | N/A | read-only |
| 13 | pozdok | x | x | x | - | - | - | N/A | read-only |
| 14 | sprzedaz | x | x | x | - | - | - | N/A | read-only |
| 15 | kasy | x | x | x | - | - | - | N/A | read-only |
| 16 | kasjerzy | x | x | x | - | - | - | N/A | read-only |
| 17 | rapsprzed | x | x | - | - | - | - | N/A | report-only |
| 18 | rappracy | x | x | - | - | - | - | N/A | report-only |

### Broken server-side parameters (ADR-031)

All broken params are excluded from `query-types.ts`. The generated API still has them
(because the OpenAPI spec reflects the documentation), but the typed query interfaces
hide them from SDK users.

| Category | Count | Description |
|----------|-------|-------------|
| par_niewlasciwe (Cat A) | 11 fields | documented as filterable, server rejects name |
| Not filterable (Cat A2) | 2 fields | formyplatn.nazwa, formyplatn.typ |
| par_bledna_wart all values (Cat B-broken) | 2 fields | towary.typ, waluty.domyslna |
| HTTP 500 Hibernate (Cat C) | 8 combos | wrong column names, NPE, property typos |

See Java `ADR/ADR-031-remove-broken-get-query-parameters.md` for full details.

---

## Response envelope pattern

All list responses wrap data in:

```json
{
  "status": 200,
  "status_opis": "Ok",
  "size": 50,
  "start": 0,
  "on_page": 50,
  "links": { "self": "?content=ABC&start=0" },
  "dane": [ ... ]
}
```

Field name is `"dane"` (Polish), not `"data"`. See Java ADR-032.
Generated TypeScript models use `dane` property name.

---

## Error hierarchy

```
Error
  NoviCloudError (base; statusCode, responseBody)
    NoviCloudAuthError         (401, 403)
    NoviCloudNotFoundError     (404, 410)
    NoviCloudRateLimitError    (429; retryAfterSeconds from Retry-After header)
    NoviCloudServerError       (5xx)
    NoviCloudNetworkError      (fetch failures, statusCode=0)
```

Factory: `NoviCloudError.of(message, response)` - async, reads response body.
Network: `NoviCloudError.network(message, cause)` - for fetch/connection errors.

All errors extend `Error`, support `instanceof` checks, preserve `cause` chain.

---

## Retry behavior

Port of Java `RetryHandler` (ADR-024, ADR-045):

| Policy field | Default | Description |
|-------------|---------|-------------|
| enabled | true | Master switch |
| retryOn5xx | true | Retry server errors |
| maxAttempts | 3 | Total attempts (>= 1) |
| backoffStrategy | "exponential" | "exponential" (1,2,4,8s) or "fixed" (1s) |
| retryOn429 | true | Retry rate limits |
| maxRetryAfterSeconds | 60 | Cap on Retry-After header |
| retryPost | true | Retry POST/create on 5xx |

Jitter: random value in `[base/2, base]` milliseconds.
429: respects Retry-After header (capped at maxRetryAfterSeconds).
Non-retryable errors (4xx except 429): thrown immediately.

---

## Pagination (PagedResult)

Port of Java `PagedResult` (ADR-051):

- `list()` returns `PagedResult<T>` implementing `AsyncIterable<T>`
- First page fetched lazily on first access
- `totalCount()` / `pageSize()` - metadata from first page
- `seek(n)` - position next iterator at zero-based offset (no HTTP)
- `seekFromPage(n)` - position at 1-based page number (uses fixed 50-record pages)
- `fetchFrom(n)` - fetch single page at offset (independent of iterator)
- `asyncListIterator()` - bidirectional iterator with `next()` / `previous()`
- `for await (const item of result)` - forward-only from position 0

URL construction: replaces `start=N` in `links.self` URL using regex.
Page boundary crossing costs one HTTP call in either direction.

---

## Authentication

HTTP Basic Auth via `Configuration.username/password` in generated runtime.
Credentials encoded as `Basic base64(account:password)` on every request.
Server-side only (Node.js) - plaintext credentials not safe for browser use.

---

## Testing

### Test framework

- **vitest** - test runner (ESM-native, fast)
- **msw** (Mock Service Worker) - HTTP mocking for integration tests
- JSON fixtures in `test/fixtures/`

### Current test coverage (session 1)

| File | Tests | Coverage |
|------|-------|----------|
| errors.test.ts | 12 | Error hierarchy, HTTP mapping, Retry-After, instanceof |
| retry.test.ts | 10 | Policy validation, retry on 5xx/429, no-retry 4xx, exhaustion |
| paging.test.ts | 13 | totalCount, seek, fetchFrom, iteration, bidirectional |
| resource-helpers.test.ts | 13 | extractors, null guards, toLink |
| integration/towary.test.ts | 13 | Full CRUD, error mapping, lifecycle, MSW |

**Total: ~61 tests** (vs Java's 548). Major gaps: only 1 of 18 endpoints has integration tests.

---

## Known gaps (vs Java SDK)

1. **Test coverage** - 61 tests vs 548. Need integration tests for all 18 endpoints.
2. **JSDoc** - no documentation on public API methods (Java has full Javadoc).
3. **Static analysis** - no ESLint/Prettier (Java has SpotBugs + PMD + Checkstyle, 0 violations).
4. **README.md** - missing (critical for npm publish).
5. **LICENSE file** - missing (package.json has license field but no file).
6. **CHANGELOG.md** - missing.
7. **ADR directory** - no formal decision records (relying on Java ADRs).
8. **License headers** - no SPDX headers on source files (Java has them on every file).
9. **CI/CD** - no GitHub Actions or similar.
10. **OWASP/SonarQube** - no security or quality scans.
11. **Git history** - only `git init`, no commits yet.

---

## Differences from Java SDK

| Aspect | Java | TypeScript |
|--------|------|------------|
| Builders | 54 builder classes (Query/Create/Update) | Plain objects with typed interfaces |
| Models | SDK-owned immutable records with `from(Raw)` | Generated interfaces used directly |
| Link unwrapping | `towar.jmId()` returns String | `towar.jm?.id` (Link object preserved) |
| Pagination | `Iterable<T>` + `ListIterator<T>` (sync) | `AsyncIterable<T>` + async `next()/previous()` |
| Error base | `RuntimeException` (unchecked) | `Error` (all JS errors are unchecked) |
| Modules | JPMS `module-info.java` | `package.json` exports field |
| Build | Maven multi-module | tsup (ESM + CJS + DTS) |
| Test framework | JUnit 5 + WireMock + Mockito | vitest + msw |
| Static analysis | SpotBugs + PMD + Checkstyle | (none yet) |
| Package registry | Maven Central | npm (planned) |

---

## Build output (2026-04-02)

```
ESM  dist/index.js      275.60 KB
CJS  dist/index.cjs     276.37 KB
DTS  dist/index.d.ts     65.10 KB
DTS  dist/index.d.cts    65.10 KB
```

`tsc --noEmit` passes with 0 errors on overlay code.
Generated code excluded from strict checks (`src/generated/` in tsconfig exclude).
