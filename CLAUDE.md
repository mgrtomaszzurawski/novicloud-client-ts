# CLAUDE.md - NoviCloud TypeScript SDK

This file provides guidance to Claude Code when working with code in this repository.

## What this is

TypeScript port of the NoviCloud Java SDK for the NoviCloud REST API (v2.10). Single npm package with OpenAPI-generated base client and hand-written SDK overlay.

The API is a Polish POS/inventory system. All field names are Polish (`nazwa`, `kod`, `aktywny`, `stawkaVat`). These are not translatable - they map directly to server JSON fields.

## Rules

**All documentation, code comments, and commit messages must be in English.**
Exception: Polish API field names (`nazwa`, `kod`, `towarId`, `formyplatn`) are untranslatable technical identifiers.

If the agent breaks any rule from this file, it must immediately use `/digging-own-grave`.

## Build and test commands

```bash
# Generate client from OpenAPI spec
npm run generate

# Build (ESM + CJS + DTS via tsup)
npm run build

# Run all 79 tests
npm test

# Run a single test file
npx vitest run test/errors.test.ts

# Run tests matching a name pattern
npx vitest run -t "maps 401"

# Type check only
npm run lint

# Demo app (requires real credentials)
NOVICLOUD_ACCOUNT=xxx NOVICLOUD_PASSWORD=yyy npm run demo
```

## Architecture

### Package structure

Single npm package, dual format (ESM + CJS). Build tool: tsup. Test runner: vitest.

Source layout:
- `src/generated/` - OpenAPI Generator output (typescript-fetch). **Never edit.**
- `src/errors.ts` - Error hierarchy (5 typed error classes + factory)
- `src/retry.ts` - RetryHandler + RetryPolicy (exponential/fixed backoff, jitter)
- `src/paging.ts` - PagedResult with AsyncIterable, seek(), fetchFrom(), bidirectional iteration
- `src/resource-helpers.ts` - Shared functions: extractDane, extractSelfLink, requireNotNull, toLink
- `src/query-types.ts` - Per-endpoint typed query interfaces (broken server params excluded per ADR-031)
- `src/resources.ts` - 18 resource client classes
- `src/client.ts` - NoviCloudClient entry point (facade)
- `src/index.ts` - Public API re-exports
- `demo/demo.ts` - Demo app exercising all 18 endpoints
- `test/` - Unit tests (errors, retry, paging, resource-helpers)
- `test/integration/` - WireMock-equivalent tests using MSW

### Two-layer pattern: generated code + hand-written SDK overlay

The OpenAPI generator produces low-level HTTP client code in `src/generated/`. This code includes `apis/` (one class per endpoint) and `models/` (request/response types). It is never edited by hand.

The hand-written SDK layer wraps the generated code and adds: retry, pagination, exception mapping, typed queries, and null guards. Unlike the Java SDK which uses separate Builder classes, the TS SDK uses plain object interfaces (idiomatic TypeScript).

### Resource client structure

All 18 resource clients in `resources.ts` follow the same template:

```ts
export class TowaryClient {
  private readonly api: TowaryApi;       // generated API class
  private readonly account: string;
  private readonly retry: RetryHandler;
  private readonly config: Configuration; // for link fetcher auth

  constructor(config: Configuration, account: string, policy?: RetryPolicy) { ... }

  list(query?: TowaryQuery): PagedResult<Towar> { ... }
  async count(query?: TowaryQuery): Promise<number> { ... }
  async getById(id: number): Promise<Towar> { ... }
  async create(towar: Towar): Promise<string | undefined> { ... }
  async update(towar: Towar): Promise<void> { ... }
  async deleteById(id: number): Promise<void> { ... }
}
```

Each client exposes only the operations its endpoint supports:
- Full CRUD: towary, asorty, jmiary, waluty, kraje, formyplatn, kontrahenci, sklepy
- No update: stawkivat (server PUT is broken, ADR-022)
- Read-only: kasy, kasjerzy, dokumenty, pozdok, sprzedaz
- Report-only (list + count): rapsprzed, rappracy
- Special: stanymag (listByTowar, getByTowarAndSklep, update), kartyloj (getByKod, no delete)

### RetryHandler call conventions

Three methods matching HTTP verb patterns:

```ts
// GET - returns value, retries on 429/5xx
retry.execute(() => api.listTowary({...}), "Failed to list towary page");

// POST - returns value, retryPost policy controls 5xx retry
retry.executePost(() => api.createTowar({...}), "Failed to create towar");

// PUT/DELETE returning void
retry.run(async () => { await api.updateTowary({...}); }, "Failed to update towar");
```

### Query types (replacing Java Builders)

Instead of Java's QueryBuilder/CreateBuilder/UpdateBuilder pattern, the TS SDK uses plain interfaces:

```ts
// Query - all fields optional
client.towary().list({ aktywny: true, kod: "ABC" });

// Create - pass generated model type directly
client.towary().create({ kod: "NEW-001", nazwa: "New Product" });

// Update - pass generated model type with id
client.towary().update({ id: 42, nazwa: "Updated" });
```

Broken server-side query parameters (ADR-031) are excluded from query interfaces entirely. The corresponding position in the generated API call passes `undefined`.

### Pagination (PagedResult)

Port of Java's PagedResult (ADR-051). Returns from all `list()` methods:

```ts
const result = client.towary().list();

// AsyncIterable - most common usage
for await (const item of result) { ... }

// Metadata (triggers lazy first-page fetch)
await result.totalCount();
await result.pageSize();

// Random access
result.seek(100);
const page = await result.fetchFrom(50);

// Bidirectional iterator
const iter = result.asyncListIterator();
await iter.next();
await iter.previous();
```

Server page size is fixed at 50 records. Link-based pagination uses the `links.self` URL with modified `start` parameter.

### Error hierarchy

`NoviCloudError.fromResponse(message, statusCode, body, retryAfter?)` maps HTTP status to typed subclass:
- 401, 403 -> `NoviCloudAuthError`
- 404, 410 -> `NoviCloudNotFoundError`
- 429 -> `NoviCloudRateLimitError` (parses `Retry-After` header)
- 5xx -> `NoviCloudServerError`
- network/IO -> `NoviCloudNetworkError`

All errors extend `NoviCloudError` which extends `Error`.

### Null-safety pattern

All `getById`/`deleteById` methods validate input:
```ts
function requireNotNull(value: unknown, fieldName: string): void {
  if (value == null) throw new Error(`${fieldName} must not be null`);
}
```

`list()` and `count()` accept undefined query (defaults to empty object `{}`).

## Key differences from Java SDK

| Java | TypeScript |
|------|-----------|
| QueryBuilder/CreateBuilder/UpdateBuilder classes | Plain object interfaces |
| Immutable record types (sdk.model) | Generated model types used directly |
| `Iterable<T>` + `ListIterator<T>` | `AsyncIterable<T>` + `AsyncPagedListIterator<T>` |
| JPMS module-info.java | ESM/CJS dual package |
| WireMock for integration tests | MSW (Mock Service Worker) |
| Maven multi-module (client + demo) | Single package + demo/ directory |
| `RetryHandler.execute/executePost/run` | Same pattern, async/await |
| `NoviCloudException` (extends RuntimeException) | `NoviCloudError` (extends Error) |
| `ApiException` from generated code | `ResponseError` from generated runtime |

## Test patterns

### Unit tests (`test/*.test.ts`)

Test core SDK infrastructure:
- `errors.test.ts` - HTTP status mapping, error properties, factory method
- `retry.test.ts` - Backoff strategies, jitter, 429/5xx handling, retryPost policy
- `paging.test.ts` - Iteration, seek, fetchFrom, bidirectional, boundary handling
- `resource-helpers.test.ts` - extractDane, requireNotNull, toLink, extractSelfLink

### Integration tests (`test/integration/*.test.ts`)

Use MSW to intercept HTTP requests at the network level:
```ts
const server = setupServer(
  http.get("*/test-account/towary", () => HttpResponse.json(listFixture)),
  http.get("*/test-account/towary/:id", () => HttpResponse.json(singleFixture)),
);
```

Pattern: create client with `new NoviCloudClient(...)` pointing at test URL, MSW intercepts requests and returns fixture data.

## Known constraints

- `noUnusedLocals`/`noUnusedParameters` disabled in tsconfig because generated code has many unused imports that tsc reports when they're transitively included
- Server-side only (Node.js 18+): uses native `fetch` and `btoa`, Basic Auth is not browser-safe
- No SDK-owned immutable record types yet (unlike Java's ADR-046 records) - uses generated models directly
- Nested composite types (Platnosc, RozbicieVat, TowarSkladnik) not wrapped

## ADRs

The Java SDK has 52 ADRs in `../ADR/` and 10 demo-app ADRs. Most apply to the TS port too. Key ones:
- ADR-005: SDK overlay pattern on generated code
- ADR-019: Exception hierarchy and retry
- ADR-022: StawkiVat PUT broken server-side (no update method)
- ADR-024: Configurable RetryPolicy
- ADR-031: 21+ broken server-side query filters removed
- ADR-032: `data` -> `dane` in response envelopes
- ADR-039: Mixed date format handling
- ADR-043: LinkFetcher shared pagination helper
- ADR-051: PagedResult - random access pagination

## Adding a new endpoint

1. Add OpenAPI spec files in `novicloud-client/openapi/` (paths, schemas, parameters)
2. Run `npm run generate` to regenerate client
3. Add query interface to `src/query-types.ts` (exclude broken params)
4. Add client class to `src/resources.ts` (copy existing pattern - soft or hard delete)
5. Add accessor method to `NoviCloudClient` in `src/client.ts`
6. Add re-export to `src/index.ts`
7. Add unit and integration tests
8. Add runner in `demo/demo.ts`
