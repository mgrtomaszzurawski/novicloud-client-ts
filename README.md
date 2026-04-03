# novicloud-client

TypeScript SDK for the [NoviCloud REST API](https://system.novicloud.pl) v2.10.

A Polish POS/inventory system API client with typed queries, automatic retry, async pagination, and error mapping. Server-side only (Node.js 18+).

## Installation

```bash
npm install novicloud-client
```

## Quick start

```ts
import { NoviCloudClient } from 'novicloud-client';

const client = NoviCloudClient.create('yourAccountName', 'yourPassword');

// List products with async iteration
for await (const towar of client.towary().list({ aktywny: true })) {
  console.log(`${towar.kod} - ${towar.nazwa}`);
}

// Get single record
const towar = await client.towary().getById(42);

// Create
const id = await client.towary().create({ kod: 'NEW-001', nazwa: 'New Product' });

// Update
await client.towary().update({ id: 42, kod: 'UPD', nazwa: 'Updated Product' });

// Delete (soft-delete: sets aktywny=false)
await client.towary().deleteById(42);

// Always close when done
client.close();
```

## Features

- **18 API endpoints** - products, currencies, shops, documents, sales, reports, and more
- **Typed queries** - per-endpoint filter interfaces with broken server params excluded
- **Async pagination** - `for await` iteration, `seek()`, `fetchFrom()` random access
- **Automatic retry** - configurable exponential/fixed backoff with jitter for 429 and 5xx
- **Error hierarchy** - typed errors (`NoviCloudAuthError`, `NoviCloudNotFoundError`, `NoviCloudRateLimitError`, `NoviCloudServerError`, `NoviCloudNetworkError`)
- **Dual package** - ESM + CommonJS with TypeScript declarations
- **Zero runtime dependencies** - uses native `fetch` (Node.js 18+)

## Configuration

```ts
import { NoviCloudClient } from 'novicloud-client';

const client = NoviCloudClient.create('account', 'password', {
  // Custom base URL (default: https://system.novicloud.pl/rest/api)
  baseUrl: 'https://custom.server/rest/api',

  // Retry policy (all fields optional, shown with defaults)
  retryPolicy: {
    enabled: true,
    maxAttempts: 3,
    backoffStrategy: 'exponential', // or 'fixed'
    retryOn429: true,
    retryOn5xx: true,
    retryPost: true,
    maxRetryAfterSeconds: 60,
  },
});
```

## Available endpoints

| Accessor | Endpoint | Operations |
|----------|----------|------------|
| `towary()` | Products | list, count, getById, create, update, delete (soft) |
| `asorty()` | Assortments | list, count, getById, create, update, delete (hard) |
| `jmiary()` | Units of measure | list, count, getById, create, update, delete (hard) |
| `stawkiVat()` | VAT rates | list, count, getById, create, delete (hard) |
| `waluty()` | Currencies | list, count, getById, create, update, delete (soft) |
| `kraje()` | Countries | list, count, getById, create, update, delete (hard) |
| `formyPlatn()` | Payment forms | list, count, getById, create, update, delete (soft) |
| `kontrahenci()` | Contractors | list, count, getById, create, update, delete (soft) |
| `sklepy()` | Shops | list, count, getById, create, update, delete (soft) |
| `kasy()` | Cash registers | list, count, getById |
| `kasjerzy()` | Cashiers | list, count, getById |
| `dokumenty()` | Documents | list, count, getById |
| `pozdok()` | Document items | list, count, getById |
| `sprzedaz()` | Sales | list, count, getById |
| `stanyMag()` | Stock levels | list, count, update, listByTowar, getByTowarAndSklep |
| `rapSprzed()` | Sales reports | list, count |
| `rapPracy()` | Work reports | list, count |
| `kartyLoj()` | Loyalty cards | list, count, getByKod, create, update |

## Pagination

All `list()` methods return a `PagedResult<T>` that supports:

```ts
const result = client.towary().list();

// Async iteration (fetches pages automatically)
for await (const item of result) { /* ... */ }

// Metadata
const total = await result.totalCount();  // total records
const perPage = await result.pageSize();  // records per page (max 50)

// Random access
result.seek(100);                          // position iterator at record 100
result.seekFromPage(3);                    // position at page 3 (record 100)
const page = await result.fetchFrom(50);   // fetch records starting at offset 50

// Bidirectional iteration
const iter = result.asyncListIterator();
const next = await iter.next();
const prev = await iter.previous();
```

## Error handling

```ts
import {
  NoviCloudError,
  NoviCloudAuthError,
  NoviCloudNotFoundError,
  NoviCloudRateLimitError,
  NoviCloudServerError,
  NoviCloudNetworkError,
} from 'novicloud-client';

try {
  await client.towary().getById(999);
} catch (e) {
  if (e instanceof NoviCloudRateLimitError) {
    console.log(`Rate limited. Retry after ${e.retryAfterSeconds}s`);
  } else if (e instanceof NoviCloudAuthError) {
    console.log(`Auth failed: ${e.statusCode}`);
  } else if (e instanceof NoviCloudNotFoundError) {
    console.log('Resource not found');
  } else if (e instanceof NoviCloudServerError) {
    console.log(`Server error: ${e.statusCode}`);
  } else if (e instanceof NoviCloudNetworkError) {
    console.log('Network error (connection refused, DNS, timeout)');
  }
}
```

## API field names

This API uses Polish field names. They are technical identifiers, not translatable:

```ts
const towar = await client.towary().getById(1);
towar.nazwa;      // product name
towar.kod;        // barcode
towar.stawkaVat;  // VAT rate in hundredths (2300 = 23%)
towar.aktywny;    // active flag (soft-delete)
towar.cenaDet;    // gross retail price
towar.jm;         // unit of measure (Link object)
towar.asort;      // assortment group (Link object)
```

## Requirements

- Node.js >= 18.0.0 (uses native `fetch`)
- Server-side only - HTTP Basic Auth is not safe for browser use

## License

[AGPL-3.0](LICENSE.txt)

## Related

- [novicloud-client-java](https://github.com/mgrtomaszzurawski/novicloud-client-java) - Java SDK (published on Maven Central)
