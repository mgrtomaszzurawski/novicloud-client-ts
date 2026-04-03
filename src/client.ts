/**
 * Main entry point for the NoviCloud TypeScript SDK.
 *
 * Usage:
 *   const client = NoviCloudClient.create('accountName', 'password');
 *   for await (const towar of client.towary().list({ aktywny: true })) {
 *     console.log(towar.nazwa);
 *   }
 */

import { Configuration } from "./generated/src/runtime.js";
import { type RetryPolicy, defaultRetryPolicy, retryPolicy } from "./retry.js";
import {
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

const USER_AGENT = "novicloud-client-ts/1.0.0";
const DEFAULT_BASE_URL = "https://system.novicloud.pl/rest/api";

export interface NoviCloudClientOptions {
  /** API base URL. Defaults to https://system.novicloud.pl/rest/api */
  baseUrl?: string;
  /** Retry policy configuration. */
  retryPolicy?: Partial<RetryPolicy>;
}

/**
 * Main client for the NoviCloud REST API.
 *
 * Provides access to all 18 API resource clients via named accessor methods.
 * Each resource client handles retry, pagination, and error mapping.
 *
 * Create via the static {@link NoviCloudClient.create} factory:
 * ```ts
 * const client = NoviCloudClient.create('accountName', 'password');
 * for await (const towar of client.towary().list({ aktywny: true })) {
 *   console.log(towar.nazwa);
 * }
 * client.close();
 * ```
 *
 * Server-side only (Node.js 18+). Uses HTTP Basic Auth - do not use in browsers.
 */
export class NoviCloudClient {
  private closed = false;

  private readonly _towary: TowaryClient;
  private readonly _asorty: AsortyClient;
  private readonly _jmiary: JmiaryClient;
  private readonly _stawkiVat: StawkiVatClient;
  private readonly _waluty: WalutyClient;
  private readonly _kraje: KrajeClient;
  private readonly _formyPlatn: FormyPlatnClient;
  private readonly _kontrahenci: KontrahenciClient;
  private readonly _sklepy: SklepyClient;
  private readonly _kasy: KasyClient;
  private readonly _kasjerzy: KasjerzyClient;
  private readonly _dokumenty: DokumentyClient;
  private readonly _pozdok: PozdokClient;
  private readonly _stanyMag: StanyMagClient;
  private readonly _sprzedaz: SprzedazClient;
  private readonly _rapSprzed: RapSprzedClient;
  private readonly _rapPracy: RapPracyClient;
  private readonly _kartyLoj: KartyLojClient;

  private constructor(config: Configuration, accountName: string, policy: RetryPolicy) {
    this._towary = new TowaryClient(config, accountName, policy);
    this._asorty = new AsortyClient(config, accountName, policy);
    this._jmiary = new JmiaryClient(config, accountName, policy);
    this._stawkiVat = new StawkiVatClient(config, accountName, policy);
    this._waluty = new WalutyClient(config, accountName, policy);
    this._kraje = new KrajeClient(config, accountName, policy);
    this._formyPlatn = new FormyPlatnClient(config, accountName, policy);
    this._kontrahenci = new KontrahenciClient(config, accountName, policy);
    this._sklepy = new SklepyClient(config, accountName, policy);
    this._kasy = new KasyClient(config, accountName, policy);
    this._kasjerzy = new KasjerzyClient(config, accountName, policy);
    this._dokumenty = new DokumentyClient(config, accountName, policy);
    this._pozdok = new PozdokClient(config, accountName, policy);
    this._stanyMag = new StanyMagClient(config, accountName, policy);
    this._sprzedaz = new SprzedazClient(config, accountName, policy);
    this._rapSprzed = new RapSprzedClient(config, accountName, policy);
    this._rapPracy = new RapPracyClient(config, accountName, policy);
    this._kartyLoj = new KartyLojClient(config, accountName, policy);
  }

  /**
   * Create a new NoviCloud client.
   *
   * @param accountName - NoviCloud account name (used as URL path segment and Basic Auth username)
   * @param password - Account password for Basic Auth
   * @param options - Optional configuration (base URL, retry policy)
   * @returns Configured client instance
   * @throws Error if accountName or password is null/undefined
   *
   * @example
   * ```ts
   * // Default settings
   * const client = NoviCloudClient.create('myAccount', 'myPassword');
   *
   * // Custom base URL and retry
   * const client = NoviCloudClient.create('myAccount', 'myPassword', {
   *   baseUrl: 'https://custom.server/rest/api',
   *   retryPolicy: { maxAttempts: 5, retryOn429: true },
   * });
   * ```
   */
  static create(
    accountName: string,
    password: string,
    options?: NoviCloudClientOptions,
  ): NoviCloudClient {
    if (accountName == null) throw new Error("accountName must not be null");
    if (password == null) throw new Error("password must not be null");

    const baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
    const policy = options?.retryPolicy ? retryPolicy(options.retryPolicy) : defaultRetryPolicy();

    const config = new Configuration({
      basePath: baseUrl,
      username: accountName,
      password: password,
      headers: { "User-Agent": USER_AGENT },
    });

    return new NoviCloudClient(config, accountName, policy);
  }

  /**
   * Mark this client as closed. Subsequent calls to resource accessors will throw.
   * Does not terminate in-flight requests.
   */
  close(): void {
    this.closed = true;
  }

  private ensureOpen(): void {
    if (this.closed) {
      throw new Error("NoviCloudClient has been closed");
    }
  }

  // -----------------------------------------------------------------------
  // Resource accessors
  // -----------------------------------------------------------------------

  /** Products (towary). Full CRUD, soft-delete (aktywny=false). */
  towary(): TowaryClient {
    this.ensureOpen();
    return this._towary;
  }
  /** Assortment groups (asorty). Full CRUD, hard-delete. */
  asorty(): AsortyClient {
    this.ensureOpen();
    return this._asorty;
  }
  /** Units of measure (jmiary). Full CRUD, hard-delete. */
  jmiary(): JmiaryClient {
    this.ensureOpen();
    return this._jmiary;
  }
  /** VAT rates (stawki VAT). Create + delete only, no update (ADR-022). Hard-delete. */
  stawkiVat(): StawkiVatClient {
    this.ensureOpen();
    return this._stawkiVat;
  }
  /** Currencies (waluty). Full CRUD, soft-delete (aktywny=false). */
  waluty(): WalutyClient {
    this.ensureOpen();
    return this._waluty;
  }
  /** Countries (kraje). Full CRUD, hard-delete. */
  kraje(): KrajeClient {
    this.ensureOpen();
    return this._kraje;
  }
  /** Payment forms (formy platnosci). Full CRUD, soft-delete (aktywny=false). */
  formyPlatn(): FormyPlatnClient {
    this.ensureOpen();
    return this._formyPlatn;
  }
  /** Contractors/vendors (kontrahenci). Full CRUD, soft-delete (aktywny=false). */
  kontrahenci(): KontrahenciClient {
    this.ensureOpen();
    return this._kontrahenci;
  }
  /** Shops/stores (sklepy). Full CRUD, soft-delete (aktywny=false). */
  sklepy(): SklepyClient {
    this.ensureOpen();
    return this._sklepy;
  }
  /** Cash registers (kasy). Read-only. */
  kasy(): KasyClient {
    this.ensureOpen();
    return this._kasy;
  }
  /** Cashiers (kasjerzy). Read-only. */
  kasjerzy(): KasjerzyClient {
    this.ensureOpen();
    return this._kasjerzy;
  }
  /** Documents (dokumenty). Read-only. */
  dokumenty(): DokumentyClient {
    this.ensureOpen();
    return this._dokumenty;
  }
  /** Document line items (pozycje dokumentow). Read-only. */
  pozdok(): PozdokClient {
    this.ensureOpen();
    return this._pozdok;
  }
  /** Stock levels (stany magazynowe). List + update. Special: listByTowar(), getByTowarAndSklep(). */
  stanyMag(): StanyMagClient {
    this.ensureOpen();
    return this._stanyMag;
  }
  /** Sales records (sprzedaz). Read-only. */
  sprzedaz(): SprzedazClient {
    this.ensureOpen();
    return this._sprzedaz;
  }
  /** Sales summary reports (raporty sprzedazy). Report-only: list + count. */
  rapSprzed(): RapSprzedClient {
    this.ensureOpen();
    return this._rapSprzed;
  }
  /** Work time reports (raporty pracy). Report-only: list + count. */
  rapPracy(): RapPracyClient {
    this.ensureOpen();
    return this._rapPracy;
  }
  /** Loyalty cards (karty lojalnosciowe). Create + update, getByKod (not getById). */
  kartyLoj(): KartyLojClient {
    this.ensureOpen();
    return this._kartyLoj;
  }
}
