/**
 * Typed query parameters for each endpoint.
 *
 * Only includes parameters that actually work server-side.
 * Broken params from ADR-031 are intentionally excluded.
 * Types match the generated API interfaces exactly (all strings unless boolean).
 *
 * Internal pagination params (start, content) are managed by PagedResult.
 */

// -- Asorty (all filters work) -----------------------------------------------
export interface AsortyQuery {
  fts?: string;
  id?: string;
  nazwa?: string;
  parentId?: string;
}

// -- Dokumenty (sklepOdbId broken - ADR-031 Cat A) ----------------------------
export interface DokumentyQuery {
  fts?: string;
  id?: string;
  typDok?: string;
  nrDok?: string;
  kontrahentId?: string;
  platnikId?: string;
  sklepId?: string;
  kasaId?: string;
  kasjerId?: string;
  dataWystawienia?: string;
  dataWplywu?: string;
  dataWykonania?: string;
  storno?: boolean;
  // sklepOdbId - broken (ADR-031 Cat A)
}

// -- FormyPlatn (nazwa, typ broken - ADR-031 Cat A2) --------------------------
export interface FormyPlatnQuery {
  id?: string;
  // nazwa - not filterable (ADR-031 Cat A2)
  // typ - not filterable (ADR-031 Cat A2)
}

// -- Jmiary (all filters work) ------------------------------------------------
export interface JmiaryQuery {
  fts?: string;
  id?: string;
  nazwa?: string;
  precyzja?: string;
}

// -- KartyLoj (nazwiskoImie, waznaOd, waznaDo broken - ADR-031 Cat A) --------
export interface KartyLojQuery {
  fts?: string;
  kod?: string;
  posiadacz?: string;
  telefon?: string;
  email?: string;
  // nazwiskoImie - broken (ADR-031 Cat A)
  // waznaOd - broken (ADR-031 Cat A)
  // waznaDo - broken (ADR-031 Cat A)
}

// -- Kasjerzy (all filters work) ----------------------------------------------
export interface KasjerzyQuery {
  fts?: string;
  id?: string;
  nazwisko?: string;
  kodKasjera?: string;
  aktywny?: boolean;
}

// -- Kasy (ecr broken - ADR-031 Cat A) ----------------------------------------
export interface KasyQuery {
  fts?: string;
  id?: string;
  nazwa?: string;
  numer?: string;
  aktywny?: boolean;
  // ecr - broken (ADR-031 Cat A)
}

// -- Kontrahenci (osoba broken - ADR-031 Cat A) -------------------------------
export interface KontrahenciQuery {
  fts?: string;
  id?: string;
  nazwa?: string;
  skrot?: string;
  nip?: string;
  aktywny?: boolean;
  // osoba - broken (ADR-031 Cat A)
}

// -- Kraje (all filters work) -------------------------------------------------
export interface KrajeQuery {
  fts?: string;
  id?: string;
  nazwa?: string;
  kod?: string;
  walutaId?: string;
}

// -- Pozdok (id, dokumentTypDok, dokumentData* broken - ADR-031 Cat C) --------
export interface PozdokQuery {
  fts?: string;
  dokumentId?: string;
  dokumentNrDok?: string;
  dokumentKontrahentId?: string;
  dokumentPlatnikId?: string;
  dokumentSklepId?: string;
  dokumentKasaId?: string;
  dokumentKasjerId?: string;
  towarId?: string;
  nrPozycji?: string;
  // id - broken (ADR-031 Cat C: wrong Hibernate column)
  // dokumentTypDok - broken (ADR-031 Cat C: NPE)
  // dokumentDataWystawienia - broken (ADR-031 Cat C)
  // dokumentDataWplywu - broken (ADR-031 Cat C)
  // dokumentDataWykonania - broken (ADR-031 Cat C)
}

// -- RapPracy (all filters work with correct types) ---------------------------
export type RapPracyGrupowanie = "sklep" | "kasa" | "kasjer";

export interface RapPracyQuery {
  sklepId?: string;
  kasaId?: string;
  kasjerId?: string;
  dataPocz?: string;
  dataKonc?: string;
  grupowanie?: RapPracyGrupowanie;
}

// -- RapSprzed (all filters work with correct types) --------------------------
export type RapSprzedGrupowanie =
  | "towar"
  | "asort"
  | "sklep"
  | "kasa"
  | "kasjer"
  | "kontr"
  | "kartarab"
  | "formaplatn";

export interface RapSprzedQuery {
  sklepId?: string;
  kasaId?: string;
  kasjerId?: string;
  dataPocz?: string;
  dataKonc?: string;
  grupowanie?: RapSprzedGrupowanie;
  skladniki?: string;
}

// -- Sklepy (nrDomu, nrLokalu, poczta, krajId broken - ADR-031 Cat A) --------
export interface SklepyQuery {
  fts?: string;
  id?: string;
  nazwa?: string;
  numer?: string;
  aktywny?: boolean;
  // nrDomu - broken (ADR-031 Cat A)
  // nrLokalu - broken (ADR-031 Cat A)
  // poczta - broken (ADR-031 Cat A)
  // krajId - broken (ADR-031 Cat A)
}

// -- Sprzedaz (nrRapDob, cenaPrzedRab broken - ADR-031 Cat A/C) ---------------
export interface SprzedazQuery {
  fts?: string;
  id?: string;
  towarId?: string;
  sklepId?: string;
  kasaId?: string;
  kasjerId?: string;
  kontrahentId?: string;
  typDok?: string;
  brutto?: string;
  ilosc?: string;
  cena?: string;
  rabat?: string;
  stawkaVat?: string;
  podatek?: string;
  data?: string;
  // nrRapDob - broken (ADR-031 Cat A)
  // cenaPrzedRab - broken (ADR-031 Cat C: wrong Hibernate column)
}

// -- StanyMag (all filters work) ----------------------------------------------
export interface StanyMagQuery {
  towarId?: string;
  sklepId?: string;
  naDzien?: string;
}

// -- StawkiVat (only id filter in generated API) ------------------------------
export interface StawkiVatQuery {
  id?: string;
}

// -- Towary (typ, cenaDet broken - ADR-031 Cat B-broken/C) --------------------
export interface TowaryQuery {
  fts?: string;
  id?: string;
  nazwa?: string;
  kod?: string;
  stawkaVat?: string;
  akcyzowy?: boolean;
  jmId?: string;
  asortId?: string;
  aktywny?: boolean;
  // typ - broken (ADR-031 Cat B-broken: rejects all values)
  // cenaDet - broken (ADR-031 Cat C: wrong Hibernate property)
}

// -- Waluty (domyslna broken - ADR-031 Cat B-broken) --------------------------
export interface WalutyQuery {
  fts?: string;
  id?: string;
  nazwa?: string;
  kurs?: string;
  aktywny?: boolean;
  // domyslna - broken (ADR-031 Cat B-broken: rejects true/false)
}
