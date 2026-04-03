// Main entry point
export { NoviCloudClient, type NoviCloudClientOptions } from "./client.js";

// Error hierarchy
export {
  NoviCloudError,
  NoviCloudAuthError,
  NoviCloudNotFoundError,
  NoviCloudRateLimitError,
  NoviCloudServerError,
  NoviCloudNetworkError,
} from "./errors.js";

// Retry configuration
export {
  type RetryPolicy,
  type BackoffStrategy,
  defaultRetryPolicy,
  retryPolicy,
} from "./retry.js";

// Pagination
export { PagedResult, type AsyncPagedListIterator } from "./paging.js";

// Query types (safe subsets excluding broken params)
export type {
  TowaryQuery,
  AsortyQuery,
  JmiaryQuery,
  StawkiVatQuery,
  WalutyQuery,
  KrajeQuery,
  FormyPlatnQuery,
  KontrahenciQuery,
  SklepyQuery,
  KasyQuery,
  KasjerzyQuery,
  DokumentyQuery,
  PozdokQuery,
  StanyMagQuery,
  SprzedazQuery,
  RapSprzedQuery,
  RapPracyQuery,
  RapPracyGrupowanie,
  RapSprzedGrupowanie,
  KartyLojQuery,
} from "./query-types.js";

// Resource clients (for advanced use - normally accessed via NoviCloudClient)
export {
  TowaryClient,
  AsortyClient,
  JmiaryClient,
  StawkiVatClient,
  WalutyClient,
  KrajeClient,
  FormyPlatnClient,
  KontrahenciClient,
  SklepyClient,
  KasyClient,
  KasjerzyClient,
  DokumentyClient,
  PozdokClient,
  StanyMagClient,
  SprzedazClient,
  RapSprzedClient,
  RapPracyClient,
  KartyLojClient,
} from "./resources.js";

// Re-export generated model types for convenience
export type {
  Towar,
  Asorty,
  Jmiary,
  StawkaVat,
  Waluta,
  Kraj,
  FormaPlatn,
  Kontrahent,
  Sklep,
  Kasa,
  Kasjer,
  Dokument,
  PozycjaDokumentu,
  StanMag,
  Sprzedaz,
  RaportSprzedazy,
  RaportPracy,
  KartaLojalnosciowa,
} from "./resources.js";

// Generated enums that are part of the public API
export { TowarTypEnum, TowarPrzySprzedazyEnum } from "./generated/src/models/Towar.js";
