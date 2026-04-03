/**
 * 18 resource clients wrapping generated API classes.
 *
 * Each client provides: typed queries (excluding broken params), retry,
 * pagination via PagedResult, and error mapping.
 */

import { Configuration, ResponseError } from "./generated/src/runtime.js";
import {
  TowaryApi,
  AsortyApi,
  JmiaryApi,
  StawkiVatApi,
  WalutyApi,
  KrajeApi,
  FormyPlatnApi,
  KontrahenciApi,
  SklepyApi,
  KasyApi,
  KasjerzyApi,
  DokumentyApi,
  PozdokApi,
  StanyMagApi,
  SprzedazApi,
  RapSprzedApi,
  RapPracyApi,
  KartyLojApi,
} from "./generated/src/apis/index.js";
import type {
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
} from "./generated/src/models/index.js";
import {
  ApiResponseTowaryListFromJSON,
  ApiResponseAsortyListFromJSON,
  ApiResponseJmiaryListFromJSON,
  ApiResponseStawkiVatListFromJSON,
  ApiResponseWalutyListFromJSON,
  ApiResponseKrajeListFromJSON,
  ApiResponseFormyPlatnListFromJSON,
  ApiResponseKontrahenciListFromJSON,
  ApiResponseSklepyListFromJSON,
  ApiResponseKasyListFromJSON,
  ApiResponseKasjerzyListFromJSON,
  ApiResponseDokumentyListFromJSON,
  ApiResponsePozdokListFromJSON,
  ApiResponseStanyMagListFromJSON,
  ApiResponseSprzedazListFromJSON,
  ApiResponseRapSprzedListFromJSON,
  ApiResponseRapPracyListFromJSON,
  ApiResponseKartyLojListFromJSON,
} from "./generated/src/models/index.js";
import type {
  ApiResponseTowaryList,
  ApiResponseAsortyList,
  ApiResponseJmiaryList,
  ApiResponseStawkiVatList,
  ApiResponseWalutyList,
  ApiResponseKrajeList,
  ApiResponseFormyPlatnList,
  ApiResponseKontrahenciList,
  ApiResponseSklepyList,
  ApiResponseKasyList,
  ApiResponseKasjerzyList,
  ApiResponseDokumentyList,
  ApiResponsePozdokList,
  ApiResponseStanyMagList,
  ApiResponseSprzedazList,
  ApiResponseRapSprzedList,
  ApiResponseRapPracyList,
  ApiResponseKartyLojList,
} from "./generated/src/models/index.js";
import { RetryHandler, type RetryPolicy } from "./retry.js";
import { PagedResult } from "./paging.js";
import {
  extractSelfLink,
  extractSize,
  extractOnPage,
  extractDane,
  requireNotNull,
} from "./resource-helpers.js";
import type {
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
  KartyLojQuery,
} from "./query-types.js";

// Re-export model types for public API convenience
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
} from "./generated/src/models/index.js";

// ---------------------------------------------------------------------------
// Generic pagination wiring helper
// ---------------------------------------------------------------------------

type ListEnvelope<T> = {
  size?: number | null;
  onPage?: number | null;
  links?: { self?: string } | null;
  dane?: T[] | null;
};

function pagedResult<T, P extends ListEnvelope<T>>(
  firstPage: () => Promise<P>,
  urlFetch: (url: string) => Promise<P>,
): PagedResult<T> {
  return PagedResult.create<T, P>({
    firstPage,
    urlFetch,
    dataExtractor: extractDane,
    selfLinkExtractor: extractSelfLink,
    sizeExtractor: extractSize,
    onPageExtractor: extractOnPage,
  });
}

// ---------------------------------------------------------------------------
// Link fetcher - follows absolute pagination URLs via raw fetch
// ---------------------------------------------------------------------------

async function fetchLink<P>(
  url: string,
  config: Configuration,
  fromJson: (json: unknown) => P,
): Promise<P> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (config.username != null && config.password != null) {
    headers["Authorization"] = "Basic " + btoa(`${config.username}:${config.password}`);
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new ResponseError(response, "Link call failed");
  }
  const json = await response.json();
  return fromJson(json);
}

// ---------------------------------------------------------------------------
// Towary (Products) - soft-delete, full CRUD
// ---------------------------------------------------------------------------

/**
 * Client for the towary (products) endpoint.
 *
 * Full CRUD operations. Soft-delete: `deleteById()` sets `aktywny=false`.
 * Broken query params excluded: `typ` (ADR-031 Cat B-broken), `cenaDet` (ADR-031 Cat C).
 */
export class TowaryClient {
  private readonly api: TowaryApi;
  private readonly account: string;
  private readonly retry: RetryHandler;
  private readonly config: Configuration;

  constructor(config: Configuration, account: string, policy?: RetryPolicy) {
    this.config = config;
    this.api = new TowaryApi(config);
    this.account = account;
    this.retry = new RetryHandler(policy);
  }

  /**
   * List products with optional filters. Returns a lazy paginated result.
   * @param query - Optional filter parameters (broken params excluded per ADR-031)
   * @returns Paginated result supporting async iteration, seek, and fetchFrom
   */
  list(query?: TowaryQuery): PagedResult<Towar> {
    const q = query ?? {};
    return pagedResult<Towar, ApiResponseTowaryList>(
      () =>
        this.retry.execute(
          () =>
            this.api.listTowary({
              nazwaKonta: this.account,
              fts: q.fts,
              id: q.id,
              nazwa: q.nazwa,
              kod: q.kod,
              stawkaVat: q.stawkaVat,
              akcyzowy: q.akcyzowy,
              jmId: q.jmId,
              asortId: q.asortId,
              aktywny: q.aktywny,
            }),
          "Failed to list towary page",
        ),
      (url) =>
        this.retry.execute(
          () => fetchLink(url, this.config, ApiResponseTowaryListFromJSON),
          "Towary link call failed",
        ),
    );
  }

  /** Returns total product count matching the query. Triggers first page fetch. */
  async count(query?: TowaryQuery): Promise<number> {
    return this.list(query).totalCount();
  }

  /**
   * Fetch a single product by ID.
   * @param id - Product ID
   * @throws NoviCloudNotFoundError if the product does not exist
   * @throws Error if id is null/undefined
   */
  async getById(id: number): Promise<Towar> {
    requireNotNull(id, "id");
    const response = await this.retry.execute(
      () => this.api.getTowarById({ nazwaKonta: this.account, id }),
      "Failed to fetch towar by id",
    );
    return response.dane!;
  }

  /**
   * Create a new product.
   * @param towar - Product data (kod and nazwa are required)
   * @returns Server-assigned ID of the created product, or undefined
   */
  async create(towar: Towar): Promise<string | undefined> {
    requireNotNull(towar, "towar");
    const response = await this.retry.executePost(
      () => this.api.createTowar({ nazwaKonta: this.account, towar }),
      "Failed to create towar",
    );
    return response.dane?.id ?? undefined;
  }

  /**
   * Update an existing product.
   * @param towar - Product data with fields to update
   */
  async update(towar: Towar): Promise<void> {
    requireNotNull(towar, "towar");
    await this.retry.run(async () => {
      await this.api.updateTowary({ nazwaKonta: this.account, towar });
    }, "Failed to update towar");
  }

  /**
   * Soft-delete a product (sets aktywny=false). The record remains in the database.
   * Reactivate via update with `aktywny: true`.
   * @param id - Product ID to deactivate
   * @throws Error if id is null/undefined
   */
  async deleteById(id: number): Promise<void> {
    requireNotNull(id, "id");
    await this.retry.run(async () => {
      await this.api.deleteTowar({ nazwaKonta: this.account, id });
    }, "Failed to delete towar by id");
  }
}

// ---------------------------------------------------------------------------
// Asorty (Assortment Groups) - hard-delete, full CRUD
// ---------------------------------------------------------------------------

/** Client for the asorty (assortment groups) endpoint. Full CRUD, hard-delete. */
export class AsortyClient {
  private readonly api: AsortyApi;
  private readonly account: string;
  private readonly retry: RetryHandler;
  private readonly config: Configuration;

  constructor(config: Configuration, account: string, policy?: RetryPolicy) {
    this.config = config;
    this.api = new AsortyApi(config);
    this.account = account;
    this.retry = new RetryHandler(policy);
  }

  list(query?: AsortyQuery): PagedResult<Asorty> {
    const q = query ?? {};
    return pagedResult<Asorty, ApiResponseAsortyList>(
      () =>
        this.retry.execute(
          () =>
            this.api.listAsorty({
              nazwaKonta: this.account,
              fts: q.fts,
              id: q.id,
              nazwa: q.nazwa,
              parentId: q.parentId,
            }),
          "Failed to list asorty page",
        ),
      (url) =>
        this.retry.execute(
          () => fetchLink(url, this.config, ApiResponseAsortyListFromJSON),
          "Asorty link call failed",
        ),
    );
  }

  async count(query?: AsortyQuery): Promise<number> {
    return this.list(query).totalCount();
  }

  async getById(id: number): Promise<Asorty> {
    requireNotNull(id, "id");
    const response = await this.retry.execute(
      () => this.api.getAsortyById({ nazwaKonta: this.account, id }),
      "Failed to fetch asorty by id",
    );
    return response.dane!;
  }

  async create(asorty: Asorty): Promise<string | undefined> {
    requireNotNull(asorty, "asorty");
    const response = await this.retry.executePost(
      () => this.api.createAsorty({ nazwaKonta: this.account, asorty }),
      "Failed to create asorty",
    );
    return response.dane?.id ?? undefined;
  }

  async update(asorty: Asorty): Promise<void> {
    requireNotNull(asorty, "asorty");
    await this.retry.run(async () => {
      await this.api.updateAsorty({ nazwaKonta: this.account, asorty });
    }, "Failed to update asorty");
  }

  async deleteById(id: number): Promise<void> {
    requireNotNull(id, "id");
    await this.retry.run(async () => {
      await this.api.deleteAsorty({ nazwaKonta: this.account, id });
    }, "Failed to delete asorty by id");
  }
}

// ---------------------------------------------------------------------------
// Jmiary (Units of Measure) - hard-delete, full CRUD
// ---------------------------------------------------------------------------

/** Client for the jmiary (units of measure) endpoint. Full CRUD, hard-delete. */
export class JmiaryClient {
  private readonly api: JmiaryApi;
  private readonly account: string;
  private readonly retry: RetryHandler;
  private readonly config: Configuration;

  constructor(config: Configuration, account: string, policy?: RetryPolicy) {
    this.config = config;
    this.api = new JmiaryApi(config);
    this.account = account;
    this.retry = new RetryHandler(policy);
  }

  list(query?: JmiaryQuery): PagedResult<Jmiary> {
    const q = query ?? {};
    return pagedResult<Jmiary, ApiResponseJmiaryList>(
      () =>
        this.retry.execute(
          () =>
            this.api.listJmiary({
              nazwaKonta: this.account,
              fts: q.fts,
              id: q.id,
              nazwa: q.nazwa,
              precyzja: q.precyzja,
            }),
          "Failed to list jmiary page",
        ),
      (url) =>
        this.retry.execute(
          () => fetchLink(url, this.config, ApiResponseJmiaryListFromJSON),
          "Jmiary link call failed",
        ),
    );
  }

  async count(query?: JmiaryQuery): Promise<number> {
    return this.list(query).totalCount();
  }

  async getById(id: number): Promise<Jmiary> {
    requireNotNull(id, "id");
    const response = await this.retry.execute(
      () => this.api.getJmiaryById({ nazwaKonta: this.account, id }),
      "Failed to fetch jmiary by id",
    );
    return response.dane!;
  }

  async create(jmiary: Jmiary): Promise<string | undefined> {
    requireNotNull(jmiary, "jmiary");
    const response = await this.retry.executePost(
      () => this.api.createJmiary({ nazwaKonta: this.account, jmiary }),
      "Failed to create jmiary",
    );
    return response.dane?.id ?? undefined;
  }

  async update(jmiary: Jmiary): Promise<void> {
    requireNotNull(jmiary, "jmiary");
    await this.retry.run(async () => {
      await this.api.updateJmiary({ nazwaKonta: this.account, jmiary });
    }, "Failed to update jmiary");
  }

  async deleteById(id: number): Promise<void> {
    requireNotNull(id, "id");
    await this.retry.run(async () => {
      await this.api.deleteJmiary({ nazwaKonta: this.account, id });
    }, "Failed to delete jmiary by id");
  }
}

// ---------------------------------------------------------------------------
// StawkiVat (VAT Rates) - hard-delete, NO update (ADR-022)
// ---------------------------------------------------------------------------

/** Client for the stawkivat (VAT rates) endpoint. Create + delete only. No update - server PUT is broken (ADR-022). */
export class StawkiVatClient {
  private readonly api: StawkiVatApi;
  private readonly account: string;
  private readonly retry: RetryHandler;
  private readonly config: Configuration;

  constructor(config: Configuration, account: string, policy?: RetryPolicy) {
    this.config = config;
    this.api = new StawkiVatApi(config);
    this.account = account;
    this.retry = new RetryHandler(policy);
  }

  list(query?: StawkiVatQuery): PagedResult<StawkaVat> {
    const q = query ?? {};
    return pagedResult<StawkaVat, ApiResponseStawkiVatList>(
      () =>
        this.retry.execute(
          () =>
            this.api.listStawkiVat({
              nazwaKonta: this.account,
              id: q.id,
            }),
          "Failed to list stawkivat page",
        ),
      (url) =>
        this.retry.execute(
          () => fetchLink(url, this.config, ApiResponseStawkiVatListFromJSON),
          "StawkiVat link call failed",
        ),
    );
  }

  async count(query?: StawkiVatQuery): Promise<number> {
    return this.list(query).totalCount();
  }

  async getById(id: number): Promise<StawkaVat> {
    requireNotNull(id, "id");
    const response = await this.retry.execute(
      () => this.api.getStawkaVatById({ nazwaKonta: this.account, id }),
      "Failed to fetch stawkavat by id",
    );
    return response.dane!;
  }

  async create(stawkaVat: StawkaVat): Promise<string | undefined> {
    requireNotNull(stawkaVat, "stawkaVat");
    const response = await this.retry.executePost(
      () => this.api.createStawkaVat({ nazwaKonta: this.account, stawkaVat }),
      "Failed to create stawkavat",
    );
    return response.dane?.id ?? undefined;
  }

  // No update() - server PUT is broken (ADR-022)

  async deleteById(id: number): Promise<void> {
    requireNotNull(id, "id");
    await this.retry.run(async () => {
      await this.api.deleteStawkaVat({ nazwaKonta: this.account, id });
    }, "Failed to delete stawkavat by id");
  }
}

// ---------------------------------------------------------------------------
// Waluty (Currencies) - soft-delete, full CRUD
// ---------------------------------------------------------------------------

/** Client for the waluty (currencies) endpoint. Full CRUD, soft-delete (aktywny=false). Broken: domyslna filter (ADR-031). */
export class WalutyClient {
  private readonly api: WalutyApi;
  private readonly account: string;
  private readonly retry: RetryHandler;
  private readonly config: Configuration;

  constructor(config: Configuration, account: string, policy?: RetryPolicy) {
    this.config = config;
    this.api = new WalutyApi(config);
    this.account = account;
    this.retry = new RetryHandler(policy);
  }

  list(query?: WalutyQuery): PagedResult<Waluta> {
    const q = query ?? {};
    return pagedResult<Waluta, ApiResponseWalutyList>(
      () =>
        this.retry.execute(
          () =>
            this.api.listWaluty({
              nazwaKonta: this.account,
              fts: q.fts,
              id: q.id,
              nazwa: q.nazwa,
              kurs: q.kurs,
              aktywny: q.aktywny,
            }),
          "Failed to list waluty page",
        ),
      (url) =>
        this.retry.execute(
          () => fetchLink(url, this.config, ApiResponseWalutyListFromJSON),
          "Waluty link call failed",
        ),
    );
  }

  async count(query?: WalutyQuery): Promise<number> {
    return this.list(query).totalCount();
  }

  async getById(id: number): Promise<Waluta> {
    requireNotNull(id, "id");
    const response = await this.retry.execute(
      () => this.api.getWalutaById({ nazwaKonta: this.account, id }),
      "Failed to fetch waluta by id",
    );
    return response.dane!;
  }

  async create(waluta: Waluta): Promise<string | undefined> {
    requireNotNull(waluta, "waluta");
    const response = await this.retry.executePost(
      () => this.api.createWaluta({ nazwaKonta: this.account, waluta }),
      "Failed to create waluta",
    );
    return response.dane?.id ?? undefined;
  }

  async update(waluta: Waluta): Promise<void> {
    requireNotNull(waluta, "waluta");
    await this.retry.run(async () => {
      await this.api.updateWaluty({ nazwaKonta: this.account, waluta });
    }, "Failed to update waluta");
  }

  async deleteById(id: number): Promise<void> {
    requireNotNull(id, "id");
    await this.retry.run(async () => {
      await this.api.deleteWaluta({ nazwaKonta: this.account, id });
    }, "Failed to delete waluta by id");
  }
}

// ---------------------------------------------------------------------------
// Kraje (Countries) - hard-delete, full CRUD
// ---------------------------------------------------------------------------

/** Client for the kraje (countries) endpoint. Full CRUD, hard-delete. */
export class KrajeClient {
  private readonly api: KrajeApi;
  private readonly account: string;
  private readonly retry: RetryHandler;
  private readonly config: Configuration;

  constructor(config: Configuration, account: string, policy?: RetryPolicy) {
    this.config = config;
    this.api = new KrajeApi(config);
    this.account = account;
    this.retry = new RetryHandler(policy);
  }

  list(query?: KrajeQuery): PagedResult<Kraj> {
    const q = query ?? {};
    return pagedResult<Kraj, ApiResponseKrajeList>(
      () =>
        this.retry.execute(
          () =>
            this.api.listKraje({
              nazwaKonta: this.account,
              fts: q.fts,
              id: q.id,
              nazwa: q.nazwa,
              kod: q.kod,
              walutaId: q.walutaId,
            }),
          "Failed to list kraje page",
        ),
      (url) =>
        this.retry.execute(
          () => fetchLink(url, this.config, ApiResponseKrajeListFromJSON),
          "Kraje link call failed",
        ),
    );
  }

  async count(query?: KrajeQuery): Promise<number> {
    return this.list(query).totalCount();
  }

  async getById(id: number): Promise<Kraj> {
    requireNotNull(id, "id");
    const response = await this.retry.execute(
      () => this.api.getKrajById({ nazwaKonta: this.account, id }),
      "Failed to fetch kraj by id",
    );
    return response.dane!;
  }

  async create(kraj: Kraj): Promise<string | undefined> {
    requireNotNull(kraj, "kraj");
    const response = await this.retry.executePost(
      () => this.api.createKraj({ nazwaKonta: this.account, kraj }),
      "Failed to create kraj",
    );
    return response.dane?.id ?? undefined;
  }

  async update(kraj: Kraj): Promise<void> {
    requireNotNull(kraj, "kraj");
    await this.retry.run(async () => {
      await this.api.updateKraje({ nazwaKonta: this.account, kraj });
    }, "Failed to update kraj");
  }

  async deleteById(id: number): Promise<void> {
    requireNotNull(id, "id");
    await this.retry.run(async () => {
      await this.api.deleteKraj({ nazwaKonta: this.account, id });
    }, "Failed to delete kraj by id");
  }
}

// ---------------------------------------------------------------------------
// FormyPlatn (Payment Forms) - soft-delete, full CRUD
// ---------------------------------------------------------------------------

/** Client for the formyplatn (payment forms) endpoint. Full CRUD, soft-delete (aktywny=false). Broken: nazwa, typ filters (ADR-031). */
export class FormyPlatnClient {
  private readonly api: FormyPlatnApi;
  private readonly account: string;
  private readonly retry: RetryHandler;
  private readonly config: Configuration;

  constructor(config: Configuration, account: string, policy?: RetryPolicy) {
    this.config = config;
    this.api = new FormyPlatnApi(config);
    this.account = account;
    this.retry = new RetryHandler(policy);
  }

  list(query?: FormyPlatnQuery): PagedResult<FormaPlatn> {
    const q = query ?? {};
    return pagedResult<FormaPlatn, ApiResponseFormyPlatnList>(
      () =>
        this.retry.execute(
          () =>
            this.api.listFormyPlatn({
              nazwaKonta: this.account,
              id: q.id,
            }),
          "Failed to list formyplatn page",
        ),
      (url) =>
        this.retry.execute(
          () => fetchLink(url, this.config, ApiResponseFormyPlatnListFromJSON),
          "FormyPlatn link call failed",
        ),
    );
  }

  async count(query?: FormyPlatnQuery): Promise<number> {
    return this.list(query).totalCount();
  }

  async getById(id: number): Promise<FormaPlatn> {
    requireNotNull(id, "id");
    const response = await this.retry.execute(
      () => this.api.getFormaPlatnById({ nazwaKonta: this.account, id }),
      "Failed to fetch formaplatn by id",
    );
    return response.dane!;
  }

  async create(formaPlatn: FormaPlatn): Promise<string | undefined> {
    requireNotNull(formaPlatn, "formaPlatn");
    const response = await this.retry.executePost(
      () => this.api.createFormaPlatn({ nazwaKonta: this.account, formaPlatn }),
      "Failed to create formaplatn",
    );
    return response.dane?.id ?? undefined;
  }

  async update(formaPlatn: FormaPlatn): Promise<void> {
    requireNotNull(formaPlatn, "formaPlatn");
    await this.retry.run(async () => {
      await this.api.updateFormyPlatn({
        nazwaKonta: this.account,
        formaPlatn,
      });
    }, "Failed to update formaplatn");
  }

  async deleteById(id: number): Promise<void> {
    requireNotNull(id, "id");
    await this.retry.run(async () => {
      await this.api.deleteFormaPlatn({ nazwaKonta: this.account, id });
    }, "Failed to delete formaplatn by id");
  }
}

// ---------------------------------------------------------------------------
// Kontrahenci (Contractors) - soft-delete, full CRUD
// ---------------------------------------------------------------------------

/** Client for the kontrahenci (contractors/vendors) endpoint. Full CRUD, soft-delete (aktywny=false). Broken: osoba filter (ADR-031). */
export class KontrahenciClient {
  private readonly api: KontrahenciApi;
  private readonly account: string;
  private readonly retry: RetryHandler;
  private readonly config: Configuration;

  constructor(config: Configuration, account: string, policy?: RetryPolicy) {
    this.config = config;
    this.api = new KontrahenciApi(config);
    this.account = account;
    this.retry = new RetryHandler(policy);
  }

  list(query?: KontrahenciQuery): PagedResult<Kontrahent> {
    const q = query ?? {};
    return pagedResult<Kontrahent, ApiResponseKontrahenciList>(
      () =>
        this.retry.execute(
          () =>
            this.api.listKontrahenci({
              nazwaKonta: this.account,
              fts: q.fts,
              id: q.id,
              nazwa: q.nazwa,
              skrot: q.skrot,
              nip: q.nip,
              aktywny: q.aktywny,
            }),
          "Failed to list kontrahenci page",
        ),
      (url) =>
        this.retry.execute(
          () => fetchLink(url, this.config, ApiResponseKontrahenciListFromJSON),
          "Kontrahenci link call failed",
        ),
    );
  }

  async count(query?: KontrahenciQuery): Promise<number> {
    return this.list(query).totalCount();
  }

  async getById(id: number): Promise<Kontrahent> {
    requireNotNull(id, "id");
    const response = await this.retry.execute(
      () => this.api.getKontrahentById({ nazwaKonta: this.account, id }),
      "Failed to fetch kontrahent by id",
    );
    return response.dane!;
  }

  async create(kontrahent: Kontrahent): Promise<string | undefined> {
    requireNotNull(kontrahent, "kontrahent");
    const response = await this.retry.executePost(
      () => this.api.createKontrahent({ nazwaKonta: this.account, kontrahent }),
      "Failed to create kontrahent",
    );
    return response.dane?.id ?? undefined;
  }

  async update(kontrahent: Kontrahent): Promise<void> {
    requireNotNull(kontrahent, "kontrahent");
    await this.retry.run(async () => {
      await this.api.updateKontrahenci({
        nazwaKonta: this.account,
        kontrahent,
      });
    }, "Failed to update kontrahent");
  }

  async deleteById(id: number): Promise<void> {
    requireNotNull(id, "id");
    await this.retry.run(async () => {
      await this.api.deleteKontrahent({ nazwaKonta: this.account, id });
    }, "Failed to delete kontrahent by id");
  }
}

// ---------------------------------------------------------------------------
// Sklepy (Shops) - soft-delete, full CRUD
// ---------------------------------------------------------------------------

/** Client for the sklepy (shops/stores) endpoint. Full CRUD, soft-delete (aktywny=false). Broken: nrDomu, nrLokalu, poczta, krajId filters (ADR-031). */
export class SklepyClient {
  private readonly api: SklepyApi;
  private readonly account: string;
  private readonly retry: RetryHandler;
  private readonly config: Configuration;

  constructor(config: Configuration, account: string, policy?: RetryPolicy) {
    this.config = config;
    this.api = new SklepyApi(config);
    this.account = account;
    this.retry = new RetryHandler(policy);
  }

  list(query?: SklepyQuery): PagedResult<Sklep> {
    const q = query ?? {};
    return pagedResult<Sklep, ApiResponseSklepyList>(
      () =>
        this.retry.execute(
          () =>
            this.api.listSklepy({
              nazwaKonta: this.account,
              fts: q.fts,
              id: q.id,
              nazwa: q.nazwa,
              numer: q.numer,
              aktywny: q.aktywny,
            }),
          "Failed to list sklepy page",
        ),
      (url) =>
        this.retry.execute(
          () => fetchLink(url, this.config, ApiResponseSklepyListFromJSON),
          "Sklepy link call failed",
        ),
    );
  }

  async count(query?: SklepyQuery): Promise<number> {
    return this.list(query).totalCount();
  }

  async getById(id: number): Promise<Sklep> {
    requireNotNull(id, "id");
    const response = await this.retry.execute(
      () => this.api.getSklepById({ nazwaKonta: this.account, id }),
      "Failed to fetch sklep by id",
    );
    return response.dane!;
  }

  async create(sklep: Sklep): Promise<string | undefined> {
    requireNotNull(sklep, "sklep");
    const response = await this.retry.executePost(
      () => this.api.createSklep({ nazwaKonta: this.account, sklep }),
      "Failed to create sklep",
    );
    return response.dane?.id ?? undefined;
  }

  async update(sklep: Sklep): Promise<void> {
    requireNotNull(sklep, "sklep");
    await this.retry.run(async () => {
      await this.api.updateSklepy({ nazwaKonta: this.account, sklep });
    }, "Failed to update sklep");
  }

  async deleteById(id: number): Promise<void> {
    requireNotNull(id, "id");
    await this.retry.run(async () => {
      await this.api.deleteSklep({ nazwaKonta: this.account, id });
    }, "Failed to delete sklep by id");
  }
}

// ---------------------------------------------------------------------------
// Kasy (Cash Registers) - read-only
// ---------------------------------------------------------------------------

/** Client for the kasy (cash registers) endpoint. Read-only: list, count, getById. Broken: ecr filter (ADR-031). */
export class KasyClient {
  private readonly api: KasyApi;
  private readonly account: string;
  private readonly retry: RetryHandler;
  private readonly config: Configuration;

  constructor(config: Configuration, account: string, policy?: RetryPolicy) {
    this.config = config;
    this.api = new KasyApi(config);
    this.account = account;
    this.retry = new RetryHandler(policy);
  }

  list(query?: KasyQuery): PagedResult<Kasa> {
    const q = query ?? {};
    return pagedResult<Kasa, ApiResponseKasyList>(
      () =>
        this.retry.execute(
          () =>
            this.api.listKasy({
              nazwaKonta: this.account,
              fts: q.fts,
              id: q.id,
              nazwa: q.nazwa,
              numer: q.numer,
              aktywny: q.aktywny,
            }),
          "Failed to list kasy page",
        ),
      (url) =>
        this.retry.execute(
          () => fetchLink(url, this.config, ApiResponseKasyListFromJSON),
          "Kasy link call failed",
        ),
    );
  }

  async count(query?: KasyQuery): Promise<number> {
    return this.list(query).totalCount();
  }

  async getById(id: number): Promise<Kasa> {
    requireNotNull(id, "id");
    const response = await this.retry.execute(
      () => this.api.getKasaById({ nazwaKonta: this.account, id }),
      "Failed to fetch kasa by id",
    );
    return response.dane!;
  }
}

// ---------------------------------------------------------------------------
// Kasjerzy (Cashiers) - read-only
// ---------------------------------------------------------------------------

/** Client for the kasjerzy (cashiers) endpoint. Read-only: list, count, getById. */
export class KasjerzyClient {
  private readonly api: KasjerzyApi;
  private readonly account: string;
  private readonly retry: RetryHandler;
  private readonly config: Configuration;

  constructor(config: Configuration, account: string, policy?: RetryPolicy) {
    this.config = config;
    this.api = new KasjerzyApi(config);
    this.account = account;
    this.retry = new RetryHandler(policy);
  }

  list(query?: KasjerzyQuery): PagedResult<Kasjer> {
    const q = query ?? {};
    return pagedResult<Kasjer, ApiResponseKasjerzyList>(
      () =>
        this.retry.execute(
          () =>
            this.api.listKasjerzy({
              nazwaKonta: this.account,
              fts: q.fts,
              id: q.id,
              nazwisko: q.nazwisko,
              kodKasjera: q.kodKasjera,
              aktywny: q.aktywny,
            }),
          "Failed to list kasjerzy page",
        ),
      (url) =>
        this.retry.execute(
          () => fetchLink(url, this.config, ApiResponseKasjerzyListFromJSON),
          "Kasjerzy link call failed",
        ),
    );
  }

  async count(query?: KasjerzyQuery): Promise<number> {
    return this.list(query).totalCount();
  }

  async getById(id: number): Promise<Kasjer> {
    requireNotNull(id, "id");
    const response = await this.retry.execute(
      () => this.api.getKasjerById({ nazwaKonta: this.account, id }),
      "Failed to fetch kasjer by id",
    );
    return response.dane!;
  }
}

// ---------------------------------------------------------------------------
// Dokumenty (Documents) - read-only
// ---------------------------------------------------------------------------

/** Client for the dokumenty (documents) endpoint. Read-only: list, count, getById. Broken: sklepOdbId filter (ADR-031). */
export class DokumentyClient {
  private readonly api: DokumentyApi;
  private readonly account: string;
  private readonly retry: RetryHandler;
  private readonly config: Configuration;

  constructor(config: Configuration, account: string, policy?: RetryPolicy) {
    this.config = config;
    this.api = new DokumentyApi(config);
    this.account = account;
    this.retry = new RetryHandler(policy);
  }

  list(query?: DokumentyQuery): PagedResult<Dokument> {
    const q = query ?? {};
    return pagedResult<Dokument, ApiResponseDokumentyList>(
      () =>
        this.retry.execute(
          () =>
            this.api.listDokumenty({
              nazwaKonta: this.account,
              fts: q.fts,
              id: q.id,
              typDok: q.typDok,
              nrDok: q.nrDok,
              kontrahentId: q.kontrahentId,
              platnikId: q.platnikId,
              sklepId: q.sklepId,
              kasaId: q.kasaId,
              kasjerId: q.kasjerId,
              dataWystawienia: q.dataWystawienia,
              dataWplywu: q.dataWplywu,
              dataWykonania: q.dataWykonania,
              storno: q.storno,
            }),
          "Failed to list dokumenty page",
        ),
      (url) =>
        this.retry.execute(
          () => fetchLink(url, this.config, ApiResponseDokumentyListFromJSON),
          "Dokumenty link call failed",
        ),
    );
  }

  async count(query?: DokumentyQuery): Promise<number> {
    return this.list(query).totalCount();
  }

  async getById(id: number): Promise<Dokument> {
    requireNotNull(id, "id");
    const response = await this.retry.execute(
      () => this.api.getDokumentById({ nazwaKonta: this.account, id }),
      "Failed to fetch dokument by id",
    );
    return response.dane!;
  }
}

// ---------------------------------------------------------------------------
// Pozdok (Document Positions) - read-only
// ---------------------------------------------------------------------------

/** Client for the pozdok (document line items) endpoint. Read-only: list, count, getById. Broken: id, dokumentTypDok, dokumentData* filters (ADR-031 Cat C). */
export class PozdokClient {
  private readonly api: PozdokApi;
  private readonly account: string;
  private readonly retry: RetryHandler;
  private readonly config: Configuration;

  constructor(config: Configuration, account: string, policy?: RetryPolicy) {
    this.config = config;
    this.api = new PozdokApi(config);
    this.account = account;
    this.retry = new RetryHandler(policy);
  }

  list(query?: PozdokQuery): PagedResult<PozycjaDokumentu> {
    const q = query ?? {};
    return pagedResult<PozycjaDokumentu, ApiResponsePozdokList>(
      () =>
        this.retry.execute(
          () =>
            this.api.listPozdok({
              nazwaKonta: this.account,
              fts: q.fts,
              dokumentId: q.dokumentId,
              dokumentNrDok: q.dokumentNrDok,
              dokumentKontrahentId: q.dokumentKontrahentId,
              dokumentPlatnikId: q.dokumentPlatnikId,
              dokumentSklepId: q.dokumentSklepId,
              dokumentKasaId: q.dokumentKasaId,
              dokumentKasjerId: q.dokumentKasjerId,
              towarId: q.towarId,
              nrPozycji: q.nrPozycji,
            }),
          "Failed to list pozdok page",
        ),
      (url) =>
        this.retry.execute(
          () => fetchLink(url, this.config, ApiResponsePozdokListFromJSON),
          "Pozdok link call failed",
        ),
    );
  }

  async count(query?: PozdokQuery): Promise<number> {
    return this.list(query).totalCount();
  }

  async getById(id: number): Promise<PozycjaDokumentu> {
    requireNotNull(id, "id");
    const response = await this.retry.execute(
      () => this.api.getPozdokById({ nazwaKonta: this.account, id }),
      "Failed to fetch pozdok by id",
    );
    return response.dane!;
  }
}

// ---------------------------------------------------------------------------
// StanyMag (Stock Levels) - special: listByTowar, getByTowarAndSklep, update
// ---------------------------------------------------------------------------

/**
 * Client for the stanymag (stock levels) endpoint.
 *
 * Special operations: {@link listByTowar} and {@link getByTowarAndSklep}.
 * No getById, create, or delete. Update changes stock quantity for a towar+sklep pair.
 */
export class StanyMagClient {
  private readonly api: StanyMagApi;
  private readonly account: string;
  private readonly retry: RetryHandler;
  private readonly config: Configuration;

  constructor(config: Configuration, account: string, policy?: RetryPolicy) {
    this.config = config;
    this.api = new StanyMagApi(config);
    this.account = account;
    this.retry = new RetryHandler(policy);
  }

  list(query?: StanyMagQuery): PagedResult<StanMag> {
    const q = query ?? {};
    return pagedResult<StanMag, ApiResponseStanyMagList>(
      () =>
        this.retry.execute(
          () =>
            this.api.listStanyMag({
              nazwaKonta: this.account,
              towarId: q.towarId,
              sklepId: q.sklepId,
              naDzien: q.naDzien,
            }),
          "Failed to list stanymag page",
        ),
      (url) =>
        this.retry.execute(
          () => fetchLink(url, this.config, ApiResponseStanyMagListFromJSON),
          "StanyMag link call failed",
        ),
    );
  }

  async count(query?: StanyMagQuery): Promise<number> {
    return this.list(query).totalCount();
  }

  async listByTowar(idTowaru: number, naDzien?: string): Promise<StanMag[]> {
    requireNotNull(idTowaru, "idTowaru");
    const response = await this.retry.execute(
      () =>
        this.api.listStanyMagByTowar({
          nazwaKonta: this.account,
          idTowaru,
          naDzien,
        }),
      "Failed to list stanymag by towar",
    );
    return response.dane ?? [];
  }

  async getByTowarAndSklep(idTowaru: number, idSklepu: number, naDzien?: string): Promise<StanMag> {
    requireNotNull(idTowaru, "idTowaru");
    requireNotNull(idSklepu, "idSklepu");
    const response = await this.retry.execute(
      () =>
        this.api.getStanMagByTowarAndSklep({
          nazwaKonta: this.account,
          idTowaru,
          idSklepu,
          naDzien,
        }),
      "Failed to fetch stanmag by towar and sklep",
    );
    return response.dane!;
  }

  async update(stanMag: StanMag): Promise<void> {
    requireNotNull(stanMag, "stanMag");
    await this.retry.run(async () => {
      await this.api.updateStanMag({
        nazwaKonta: this.account,
        stanMag,
      });
    }, "Failed to update stanmag");
  }
}

// ---------------------------------------------------------------------------
// Sprzedaz (Sales) - read-only
// ---------------------------------------------------------------------------

/** Client for the sprzedaz (sales records) endpoint. Read-only: list, count, getById. Broken: nrRapDob (ADR-031 Cat A), cenaPrzedRab (ADR-031 Cat C). */
export class SprzedazClient {
  private readonly api: SprzedazApi;
  private readonly account: string;
  private readonly retry: RetryHandler;
  private readonly config: Configuration;

  constructor(config: Configuration, account: string, policy?: RetryPolicy) {
    this.config = config;
    this.api = new SprzedazApi(config);
    this.account = account;
    this.retry = new RetryHandler(policy);
  }

  list(query?: SprzedazQuery): PagedResult<Sprzedaz> {
    const q = query ?? {};
    return pagedResult<Sprzedaz, ApiResponseSprzedazList>(
      () =>
        this.retry.execute(
          () =>
            this.api.listSprzedaz({
              nazwaKonta: this.account,
              fts: q.fts,
              id: q.id,
              towarId: q.towarId,
              sklepId: q.sklepId,
              kasaId: q.kasaId,
              kasjerId: q.kasjerId,
              kontrahentId: q.kontrahentId,
              typDok: q.typDok,
              brutto: q.brutto,
              ilosc: q.ilosc,
              cena: q.cena,
              rabat: q.rabat,
              stawkaVat: q.stawkaVat,
              podatek: q.podatek,
              data: q.data,
            }),
          "Failed to list sprzedaz page",
        ),
      (url) =>
        this.retry.execute(
          () => fetchLink(url, this.config, ApiResponseSprzedazListFromJSON),
          "Sprzedaz link call failed",
        ),
    );
  }

  async count(query?: SprzedazQuery): Promise<number> {
    return this.list(query).totalCount();
  }

  async getById(id: number): Promise<Sprzedaz> {
    requireNotNull(id, "id");
    const response = await this.retry.execute(
      () => this.api.getSprzedazById({ nazwaKonta: this.account, id }),
      "Failed to fetch sprzedaz by id",
    );
    return response.dane!;
  }
}

// ---------------------------------------------------------------------------
// RapSprzed (Sales Reports) - report-only (list + count)
// ---------------------------------------------------------------------------

/** Client for the rapsprzed (sales summary reports) endpoint. Report-only: list, count. Grupowanie requires exact lowercase values (ADR-031 Cat B2). */
export class RapSprzedClient {
  private readonly api: RapSprzedApi;
  private readonly account: string;
  private readonly retry: RetryHandler;
  private readonly config: Configuration;

  constructor(config: Configuration, account: string, policy?: RetryPolicy) {
    this.config = config;
    this.api = new RapSprzedApi(config);
    this.account = account;
    this.retry = new RetryHandler(policy);
  }

  list(query?: RapSprzedQuery): PagedResult<RaportSprzedazy> {
    const q = query ?? {};
    return pagedResult<RaportSprzedazy, ApiResponseRapSprzedList>(
      () =>
        this.retry.execute(
          () =>
            this.api.listRapSprzed({
              nazwaKonta: this.account,
              sklepId: q.sklepId,
              kasaId: q.kasaId,
              kasjerId: q.kasjerId,
              dataPocz: q.dataPocz,
              dataKonc: q.dataKonc,
              grupowanie: q.grupowanie as unknown as undefined,
              skladniki: q.skladniki,
            }),
          "Failed to list rapsprzed page",
        ),
      (url) =>
        this.retry.execute(
          () => fetchLink(url, this.config, ApiResponseRapSprzedListFromJSON),
          "RapSprzed link call failed",
        ),
    );
  }

  async count(query?: RapSprzedQuery): Promise<number> {
    return this.list(query).totalCount();
  }
}

// ---------------------------------------------------------------------------
// RapPracy (Work Reports) - report-only (list + count)
// ---------------------------------------------------------------------------

/** Client for the rappracy (work time reports) endpoint. Report-only: list, count. Grupowanie requires exact lowercase values (ADR-031 Cat B2). */
export class RapPracyClient {
  private readonly api: RapPracyApi;
  private readonly account: string;
  private readonly retry: RetryHandler;
  private readonly config: Configuration;

  constructor(config: Configuration, account: string, policy?: RetryPolicy) {
    this.config = config;
    this.api = new RapPracyApi(config);
    this.account = account;
    this.retry = new RetryHandler(policy);
  }

  list(query?: RapPracyQuery): PagedResult<RaportPracy> {
    const q = query ?? {};
    return pagedResult<RaportPracy, ApiResponseRapPracyList>(
      () =>
        this.retry.execute(
          () =>
            this.api.listRapPracy({
              nazwaKonta: this.account,
              sklepId: q.sklepId,
              kasaId: q.kasaId,
              kasjerId: q.kasjerId,
              dataPocz: q.dataPocz,
              dataKonc: q.dataKonc,
              grupowanie: q.grupowanie as unknown as undefined,
            }),
          "Failed to list rappracy page",
        ),
      (url) =>
        this.retry.execute(
          () => fetchLink(url, this.config, ApiResponseRapPracyListFromJSON),
          "RapPracy link call failed",
        ),
    );
  }

  async count(query?: RapPracyQuery): Promise<number> {
    return this.list(query).totalCount();
  }
}

// ---------------------------------------------------------------------------
// KartyLoj (Loyalty Cards) - special: getByKod, no getById/delete
// ---------------------------------------------------------------------------

/**
 * Client for the kartyloj (loyalty cards) endpoint.
 *
 * Create + update, no delete. Lookup by card code ({@link getByKod}), not by numeric ID.
 * Invalidation via PUT with `uniewazniono` date field.
 * Broken: nazwiskoImie, waznaOd, waznaDo filters (ADR-031 Cat A).
 */
export class KartyLojClient {
  private readonly api: KartyLojApi;
  private readonly account: string;
  private readonly retry: RetryHandler;
  private readonly config: Configuration;

  constructor(config: Configuration, account: string, policy?: RetryPolicy) {
    this.config = config;
    this.api = new KartyLojApi(config);
    this.account = account;
    this.retry = new RetryHandler(policy);
  }

  list(query?: KartyLojQuery): PagedResult<KartaLojalnosciowa> {
    const q = query ?? {};
    return pagedResult<KartaLojalnosciowa, ApiResponseKartyLojList>(
      () =>
        this.retry.execute(
          () =>
            this.api.listKartyLoj({
              nazwaKonta: this.account,
              fts: q.fts,
              kod: q.kod,
              posiadacz: q.posiadacz,
              telefon: q.telefon,
              email: q.email,
            }),
          "Failed to list kartyloj page",
        ),
      (url) =>
        this.retry.execute(
          () => fetchLink(url, this.config, ApiResponseKartyLojListFromJSON),
          "KartyLoj link call failed",
        ),
    );
  }

  async count(query?: KartyLojQuery): Promise<number> {
    return this.list(query).totalCount();
  }

  async getByKod(kod: string): Promise<KartaLojalnosciowa> {
    requireNotNull(kod, "kod");
    const response = await this.retry.execute(
      () => this.api.getKartaLojByKod({ nazwaKonta: this.account, kod }),
      "Failed to fetch kartaloj by kod",
    );
    return response.dane!;
  }

  async create(kartaLojalnosciowa: KartaLojalnosciowa): Promise<string | undefined> {
    requireNotNull(kartaLojalnosciowa, "kartaLojalnosciowa");
    const response = await this.retry.executePost(
      () =>
        this.api.createKartaLoj({
          nazwaKonta: this.account,
          kartaLojalnosciowa,
        }),
      "Failed to create kartaloj",
    );
    return response.dane?.id ?? undefined;
  }

  async update(kartaLojalnosciowa: KartaLojalnosciowa): Promise<void> {
    requireNotNull(kartaLojalnosciowa, "kartaLojalnosciowa");
    await this.retry.run(async () => {
      await this.api.updateKartyLoj({
        nazwaKonta: this.account,
        kartaLojalnosciowa,
      });
    }, "Failed to update kartaloj");
  }
}
