/**
 * NoviCloud TypeScript SDK Demo App
 *
 * Exercises all 18 endpoints. Four modes:
 *   READ_ONLY   - list + getById only (default)
 *   CRUD_SAFE   - additionally tests create/delete on hard-delete endpoints
 *                 (asorty, jmiary, stawkivat) where records are fully removed
 *   CREATE_SOFT - creates one test record per soft-delete endpoint, saves IDs to file
 *   CRUD_ALL    - full CRUD on all writable endpoints using saved IDs from CREATE_SOFT
 *
 * Usage:
 *   NOVICLOUD_ACCOUNT=acct NOVICLOUD_PASSWORD=pass npm run demo
 *
 * Optional:
 *   NOVICLOUD_BASE_URL=https://system.novicloud.pl/rest/api  (default)
 *   DEMO_MODE=READ_ONLY|CRUD_SAFE|CREATE_SOFT|CRUD_ALL  (default: READ_ONLY)
 */

import { readFile, writeFile } from "node:fs/promises";
import { NoviCloudClient, NoviCloudError, type PagedResult } from "../src/index.js";
import { JmiaryPrecyzjaEnum } from "../src/generated/src/models/Jmiary.js";
import { FormaPlatnTypEnum } from "../src/generated/src/models/FormaPlatn.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ACCOUNT = process.env.NOVICLOUD_ACCOUNT;
const PASSWORD = process.env.NOVICLOUD_PASSWORD;
const BASE_URL = process.env.NOVICLOUD_BASE_URL;
const MODE = (process.env.DEMO_MODE ?? "READ_ONLY").toUpperCase();
const VALID_MODES = ["READ_ONLY", "CRUD_SAFE", "CREATE_SOFT", "CRUD_ALL"];

if (!ACCOUNT || !PASSWORD) {
  console.error("Set NOVICLOUD_ACCOUNT and NOVICLOUD_PASSWORD env vars.");
  process.exit(1);
}

if (!VALID_MODES.includes(MODE)) {
  console.error(`Invalid DEMO_MODE=${MODE}. Valid: ${VALID_MODES.join(", ")}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIST_LIMIT = 3;
const SEEK_POSITION = 76;
const SEPARATOR_WIDTH = 60;
const RADIX_DECIMAL = 10;
const SOFT_DELETE_IDS_FILE = "demo-soft-delete-ids.json";

// Hard-delete CRUD test data
const CRUD_TIMESTAMP = Date.now();
const CRUD_ASORTY_NAME = `sdk-test-asorty-${CRUD_TIMESTAMP}`;
const CRUD_JMIARY_NAME = `sdk-test-jm-${CRUD_TIMESTAMP}`;
const CRUD_STAWKIVAT_ID = 9999;
const CRUD_STAWKIVAT_OPIS = "99.99% SDK-TEST";
const CRUD_STAWKIVAT_ETYKIETA = "G";

// Soft-delete CREATE_SOFT test data
const SOFT_TOWAR_KOD = "SDK-DEMO-T-001";
const SOFT_TOWAR_NAZWA = "SDK Demo Towar";
const SOFT_WALUTA_KOD = "USD";
const SOFT_WALUTA_NAZWA = "SDK Demo Waluta";
const SOFT_KONTRAHENT_NAZWA = "SDK Demo Kontrahent";
const SOFT_SKLEP_NAZWA = "SDK Demo Sklep";
const SOFT_SKLEP_NUMER = 9999;
const SOFT_FORMA_NAZWA = "SDK-TEST Forma";
const SOFT_FORMA_TYP = FormaPlatnTypEnum.NUMBER_1;
const SOFT_FORMA_RESZTA = false;
const SOFT_KARTYLOJ_KOD = "SDK-DEMO-LOJ-001";
const SOFT_KARTYLOJ_HOLDER = "SDK Demo Holder";
const SOFT_KARTYLOJ_EMAIL = "sdk-test@example.com";

// CRUD_ALL update values
const UPDATED_TOWAR_NAZWA = "SDK Demo Towar Updated";
const UPDATED_WALUTA_NAZWA = "SDK Demo Waluta Updated";
const UPDATED_KONTRAHENT_NAZWA = "SDK Demo Kontrahent Updated";
const UPDATED_SKLEP_NAZWA = "SDK Demo Sklep Updated";
const UPDATED_FORMA_NAZWA = "SDK-TEST Forma Updated";
const UPDATED_FORMA_TYP = FormaPlatnTypEnum.NUMBER_2;
const UPDATED_FORMA_RESZTA = true;
const UPDATED_KARTYLOJ_HOLDER = "SDK Demo Holder Updated";
const KARTYLOJ_INVALIDATE_DATE = new Date("2099-12-31T00:00:00");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(endpoint: string, message: string): void {
  console.log(`[${endpoint}] ${message}`);
}

async function runList<T>(
  endpoint: string,
  result: PagedResult<T>,
  label: (item: T) => string,
): Promise<void> {
  const count = await result.totalCount();
  log(endpoint, `count -> ${count}`);

  let index = 0;
  for await (const item of result) {
    if (index >= LIST_LIMIT) {
      log(endpoint, `... (${count - LIST_LIMIT} more)`);
      break;
    }
    log(endpoint, `  [${index}] ${label(item)}`);
    index++;
  }

  // seek test
  if (count > SEEK_POSITION) {
    result.seek(SEEK_POSITION);
    const iterator = result.asyncListIterator();
    const { value, done } = await iterator.next();
    if (!done) {
      log(endpoint, `seek(${SEEK_POSITION}) -> ${label(value)}`);
    }
  } else {
    log(endpoint, `seek(${SEEK_POSITION}) -> skipped (totalCount=${count})`);
  }
}

async function safe(endpoint: string, action: () => Promise<void>): Promise<boolean> {
  try {
    await action();
    log(endpoint, "PASSED");
    return true;
  } catch (error) {
    if (error instanceof NoviCloudError) {
      log(endpoint, `FAILED: ${error.name} ${error.statusCode} - ${error.message}`);
    } else {
      log(endpoint, `FAILED: ${error}`);
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// Soft-delete IDs persistence
// ---------------------------------------------------------------------------

interface SoftDeleteIds {
  "towary.id"?: string;
  "waluty.id"?: string;
  "kontrahenci.id"?: string;
  "sklepy.id"?: string;
  "formyplatn.id"?: string;
  "kartyloj.kod"?: string;
}

async function saveSoftDeleteIds(ids: SoftDeleteIds): Promise<void> {
  await writeFile(SOFT_DELETE_IDS_FILE, JSON.stringify(ids, null, 2), "utf-8");
  console.log(`\nSaved soft-delete IDs to ${SOFT_DELETE_IDS_FILE}`);
}

async function loadSoftDeleteIds(): Promise<SoftDeleteIds> {
  try {
    const content = await readFile(SOFT_DELETE_IDS_FILE, "utf-8");
    return JSON.parse(content) as SoftDeleteIds;
  } catch {
    throw new Error(
      `${SOFT_DELETE_IDS_FILE} not found. Run with DEMO_MODE=CREATE_SOFT first.`,
    );
  }
}

// ---------------------------------------------------------------------------
// CRUD helper - shared create -> read -> update -> delete cycle (hard-delete)
// ---------------------------------------------------------------------------

interface CrudClient<T> {
  create(item: T): Promise<string | undefined>;
  getById(id: number): Promise<T>;
  update(item: T): Promise<void>;
  deleteById(id: number): Promise<void>;
}

async function runHardDeleteCrudCycle<T>(
  endpoint: string,
  api: CrudClient<T>,
  createPayload: T,
  updatePayload: (createdId: number) => T,
  labelFn: (item: T) => string,
): Promise<void> {
  log(endpoint, "create...");
  const createdId = await api.create(createPayload);
  log(endpoint, `created -> id=${createdId}`);

  if (!createdId) {
    log(endpoint, "SKIP: create returned no id");
    return;
  }

  const numericId = parseInt(createdId, RADIX_DECIMAL);
  const fetched = await api.getById(numericId);
  log(endpoint, `getById(${numericId}) -> ${labelFn(fetched)}`);

  await api.update(updatePayload(numericId));
  const afterUpdate = await api.getById(numericId);
  log(endpoint, `update -> ${labelFn(afterUpdate)}`);

  await api.deleteById(numericId);
  log(endpoint, `deleteById(${numericId}) -> hard-deleted`);
}

// ---------------------------------------------------------------------------
// CRUD_SAFE runners (hard-delete endpoints only)
// ---------------------------------------------------------------------------

async function runCrudAsorty(client: NoviCloudClient): Promise<void> {
  await runHardDeleteCrudCycle(
    "crud-asorty",
    client.asorty(),
    { nazwa: CRUD_ASORTY_NAME },
    (createdId) => ({ id: createdId, nazwa: `${CRUD_ASORTY_NAME}-updated` }),
    (item) => `nazwa=${item.nazwa}`,
  );
}

async function runCrudJmiary(client: NoviCloudClient): Promise<void> {
  await runHardDeleteCrudCycle(
    "crud-jmiary",
    client.jmiary(),
    { nazwa: CRUD_JMIARY_NAME, precyzja: JmiaryPrecyzjaEnum.NUMBER_2 },
    (createdId) => ({
      id: createdId,
      nazwa: `${CRUD_JMIARY_NAME}-upd`,
      precyzja: JmiaryPrecyzjaEnum.NUMBER_3,
    }),
    (item) => `nazwa=${item.nazwa} precyzja=${item.precyzja}`,
  );
}

async function runCrudStawkiVat(client: NoviCloudClient): Promise<void> {
  const api = client.stawkiVat();
  const endpoint = "crud-stawkivat";

  // Cleanup if leftover from previous run
  try {
    await api.getById(CRUD_STAWKIVAT_ID);
    log(endpoint, `cleanup: deleting leftover id=${CRUD_STAWKIVAT_ID}`);
    await api.deleteById(CRUD_STAWKIVAT_ID);
  } catch {
    // Not found - expected
  }

  log(endpoint, "create...");
  await api.create({
    id: CRUD_STAWKIVAT_ID,
    opis: CRUD_STAWKIVAT_OPIS,
    etykieta: CRUD_STAWKIVAT_ETYKIETA,
  });
  log(endpoint, `created -> id=${CRUD_STAWKIVAT_ID}`);

  const fetched = await api.getById(CRUD_STAWKIVAT_ID);
  log(endpoint, `getById(${CRUD_STAWKIVAT_ID}) -> opis=${fetched.opis} etykieta=${fetched.etykieta}`);

  log(endpoint, "no update - ADR-022 (server PUT broken)");

  await api.deleteById(CRUD_STAWKIVAT_ID);
  log(endpoint, `deleteById(${CRUD_STAWKIVAT_ID}) -> hard-deleted`);
}

// ---------------------------------------------------------------------------
// CREATE_SOFT runners - create one test record per soft-delete endpoint
// ---------------------------------------------------------------------------

async function runCreateSoftTowary(
  client: NoviCloudClient,
  ids: SoftDeleteIds,
): Promise<void> {
  const api = client.towary();
  const endpoint = "create-soft-towary";

  log(endpoint, "create...");
  const createdId = await api.create({
    kod: SOFT_TOWAR_KOD,
    nazwa: SOFT_TOWAR_NAZWA,
  });
  ids["towary.id"] = createdId;
  log(endpoint, `created -> id=${createdId}`);
}

async function runCreateSoftWaluty(
  client: NoviCloudClient,
  ids: SoftDeleteIds,
): Promise<void> {
  const api = client.waluty();
  const endpoint = "create-soft-waluty";

  log(endpoint, "create...");
  const createdId = await api.create({
    nazwa: SOFT_WALUTA_NAZWA,
    kod: SOFT_WALUTA_KOD,
  });
  ids["waluty.id"] = createdId;
  log(endpoint, `created -> id=${createdId}`);
}

async function runCreateSoftKontrahenci(
  client: NoviCloudClient,
  ids: SoftDeleteIds,
): Promise<void> {
  const api = client.kontrahenci();
  const endpoint = "create-soft-kontrahenci";

  log(endpoint, "create...");
  const createdId = await api.create({ nazwa: SOFT_KONTRAHENT_NAZWA });
  ids["kontrahenci.id"] = createdId;
  log(endpoint, `created -> id=${createdId}`);
}

async function runCreateSoftSklepy(
  client: NoviCloudClient,
  ids: SoftDeleteIds,
): Promise<void> {
  const api = client.sklepy();
  const endpoint = "create-soft-sklepy";

  log(endpoint, "create...");
  const createdId = await api.create({
    nazwa: SOFT_SKLEP_NAZWA,
    numer: SOFT_SKLEP_NUMER,
  });
  ids["sklepy.id"] = createdId;
  log(endpoint, `created -> id=${createdId}`);
}

async function runCreateSoftFormyPlatn(
  client: NoviCloudClient,
  ids: SoftDeleteIds,
): Promise<void> {
  const api = client.formyPlatn();
  const endpoint = "create-soft-formyplatn";

  log(endpoint, "create...");
  const createdId = await api.create({
    nazwa: SOFT_FORMA_NAZWA,
    typ: SOFT_FORMA_TYP,
    reszta: SOFT_FORMA_RESZTA,
  });
  ids["formyplatn.id"] = createdId;
  log(endpoint, `created -> id=${createdId}`);
}

async function runCreateSoftKartyLoj(
  client: NoviCloudClient,
  ids: SoftDeleteIds,
): Promise<void> {
  const api = client.kartyLoj();
  const endpoint = "create-soft-kartyloj";

  log(endpoint, "create...");
  await api.create({
    kod: SOFT_KARTYLOJ_KOD,
    nazwiskoImie: SOFT_KARTYLOJ_HOLDER,
    email: SOFT_KARTYLOJ_EMAIL,
  });
  // KartyLoj uses kod as primary key, not numeric ID
  ids["kartyloj.kod"] = SOFT_KARTYLOJ_KOD;
  log(endpoint, `created -> kod=${SOFT_KARTYLOJ_KOD}`);
}

// ---------------------------------------------------------------------------
// CRUD_ALL runners - full CRUD on soft-delete endpoints using saved IDs
// ---------------------------------------------------------------------------

async function runCrudAllTowary(
  client: NoviCloudClient,
  ids: SoftDeleteIds,
): Promise<void> {
  const api = client.towary();
  const endpoint = "crud-all-towary";
  const recordId = parseInt(ids["towary.id"]!, RADIX_DECIMAL);

  // Reactivate if inactive from previous failed run
  const existing = await api.getById(recordId);
  if (existing.aktywny === false) {
    log(endpoint, "reactivating previously deactivated record...");
    await api.update({ id: recordId, kod: existing.kod!, nazwa: existing.nazwa!, aktywny: true });
  }

  log(endpoint, `getById(${recordId}) -> nazwa=${existing.nazwa}`);

  await api.update({ id: recordId, kod: existing.kod!, nazwa: UPDATED_TOWAR_NAZWA });
  const afterUpdate = await api.getById(recordId);
  log(endpoint, `update -> nazwa=${afterUpdate.nazwa}`);

  await api.deleteById(recordId);
  const afterDelete = await api.getById(recordId);
  log(endpoint, `deleteById(${recordId}) -> aktywny=${afterDelete.aktywny} (soft-deleted)`);

  // Restore
  await api.update({ id: recordId, kod: afterDelete.kod!, nazwa: afterDelete.nazwa!, aktywny: true });
  const afterRestore = await api.getById(recordId);
  log(endpoint, `restore -> aktywny=${afterRestore.aktywny}`);
}

async function runCrudAllWaluty(
  client: NoviCloudClient,
  ids: SoftDeleteIds,
): Promise<void> {
  const api = client.waluty();
  const endpoint = "crud-all-waluty";
  const recordId = parseInt(ids["waluty.id"]!, RADIX_DECIMAL);

  const existing = await api.getById(recordId);
  if (existing.aktywny === false) {
    log(endpoint, "reactivating previously deactivated record...");
    await api.update({ id: recordId, nazwa: existing.nazwa!, kod: existing.kod!, aktywny: true });
  }

  log(endpoint, `getById(${recordId}) -> nazwa=${existing.nazwa}`);

  await api.update({ id: recordId, nazwa: UPDATED_WALUTA_NAZWA, kod: existing.kod! });
  const afterUpdate = await api.getById(recordId);
  log(endpoint, `update -> nazwa=${afterUpdate.nazwa}`);

  await api.deleteById(recordId);
  const afterDelete = await api.getById(recordId);
  log(endpoint, `deleteById(${recordId}) -> aktywny=${afterDelete.aktywny} (soft-deleted)`);

  // Restore
  await api.update({ id: recordId, nazwa: afterDelete.nazwa!, kod: afterDelete.kod!, aktywny: true });
  const afterRestore = await api.getById(recordId);
  log(endpoint, `restore -> aktywny=${afterRestore.aktywny}`);
}

async function runCrudAllKontrahenci(
  client: NoviCloudClient,
  ids: SoftDeleteIds,
): Promise<void> {
  const api = client.kontrahenci();
  const endpoint = "crud-all-kontrahenci";
  const recordId = parseInt(ids["kontrahenci.id"]!, RADIX_DECIMAL);

  const existing = await api.getById(recordId);
  if (existing.aktywny === false) {
    log(endpoint, "reactivating previously deactivated record...");
    await api.update({ id: recordId, nazwa: existing.nazwa!, aktywny: true });
  }

  log(endpoint, `getById(${recordId}) -> nazwa=${existing.nazwa}`);

  await api.update({ id: recordId, nazwa: UPDATED_KONTRAHENT_NAZWA });
  const afterUpdate = await api.getById(recordId);
  log(endpoint, `update -> nazwa=${afterUpdate.nazwa}`);

  await api.deleteById(recordId);
  const afterDelete = await api.getById(recordId);
  log(endpoint, `deleteById(${recordId}) -> aktywny=${afterDelete.aktywny} (soft-deleted)`);

  // Restore
  await api.update({ id: recordId, nazwa: afterDelete.nazwa!, aktywny: true });
  const afterRestore = await api.getById(recordId);
  log(endpoint, `restore -> aktywny=${afterRestore.aktywny}`);
}

async function runCrudAllSklepy(
  client: NoviCloudClient,
  ids: SoftDeleteIds,
): Promise<void> {
  const api = client.sklepy();
  const endpoint = "crud-all-sklepy";
  const recordId = parseInt(ids["sklepy.id"]!, RADIX_DECIMAL);

  const existing = await api.getById(recordId);
  if (existing.aktywny === false) {
    log(endpoint, "reactivating previously deactivated record...");
    await api.update({ id: recordId, nazwa: existing.nazwa!, numer: existing.numer!, aktywny: true });
  }

  log(endpoint, `getById(${recordId}) -> nazwa=${existing.nazwa}`);

  await api.update({ id: recordId, nazwa: UPDATED_SKLEP_NAZWA, numer: existing.numer! });
  const afterUpdate = await api.getById(recordId);
  log(endpoint, `update -> nazwa=${afterUpdate.nazwa}`);

  await api.deleteById(recordId);
  const afterDelete = await api.getById(recordId);
  log(endpoint, `deleteById(${recordId}) -> aktywny=${afterDelete.aktywny} (soft-deleted)`);

  // Restore
  await api.update({ id: recordId, nazwa: afterDelete.nazwa!, numer: afterDelete.numer!, aktywny: true });
  const afterRestore = await api.getById(recordId);
  log(endpoint, `restore -> aktywny=${afterRestore.aktywny}`);
}

async function runCrudAllFormyPlatn(
  client: NoviCloudClient,
  ids: SoftDeleteIds,
): Promise<void> {
  const api = client.formyPlatn();
  const endpoint = "crud-all-formyplatn";
  const recordId = parseInt(ids["formyplatn.id"]!, RADIX_DECIMAL);

  const existing = await api.getById(recordId);
  if (existing.aktywny === false) {
    log(endpoint, "reactivating previously deactivated record...");
    await api.update({ id: recordId, nazwa: existing.nazwa!, typ: existing.typ!, aktywny: true });
  }

  log(endpoint, `getById(${recordId}) -> nazwa=${existing.nazwa} typ=${existing.typ}`);

  await api.update({
    id: recordId,
    nazwa: UPDATED_FORMA_NAZWA,
    typ: UPDATED_FORMA_TYP,
    reszta: UPDATED_FORMA_RESZTA,
  });
  const afterUpdate = await api.getById(recordId);
  log(endpoint, `update -> nazwa=${afterUpdate.nazwa} typ=${afterUpdate.typ} reszta=${afterUpdate.reszta}`);

  await api.deleteById(recordId);
  const afterDelete = await api.getById(recordId);
  log(endpoint, `deleteById(${recordId}) -> aktywny=${afterDelete.aktywny} (soft-deleted)`);

  // Restore
  await api.update({
    id: recordId,
    nazwa: afterDelete.nazwa!,
    typ: afterDelete.typ!,
    reszta: afterDelete.reszta,
    aktywny: true,
  });
  const afterRestore = await api.getById(recordId);
  log(endpoint, `restore -> aktywny=${afterRestore.aktywny}`);
}

async function runCrudAllKartyLoj(
  client: NoviCloudClient,
  ids: SoftDeleteIds,
): Promise<void> {
  const api = client.kartyLoj();
  const endpoint = "crud-all-kartyloj";
  const cardKod = ids["kartyloj.kod"]!;

  // Clear invalidation if leftover from previous run
  const existing = await api.getByKod(cardKod);
  if (existing.uniewazniono) {
    log(endpoint, "clearing previous invalidation...");
    await api.update({ kod: cardKod, uniewazniono: undefined });
  }

  log(endpoint, `getByKod(${cardKod}) -> nazwiskoImie=${existing.nazwiskoImie}`);

  // Update holder name
  await api.update({ kod: cardKod, nazwiskoImie: UPDATED_KARTYLOJ_HOLDER });
  const afterUpdate = await api.getByKod(cardKod);
  log(endpoint, `update -> nazwiskoImie=${afterUpdate.nazwiskoImie}`);

  // Invalidate (soft-delete equivalent)
  await api.update({ kod: cardKod, uniewazniono: KARTYLOJ_INVALIDATE_DATE });
  const afterInvalidate = await api.getByKod(cardKod);
  log(endpoint, `invalidate -> uniewazniono=${afterInvalidate.uniewazniono} (soft-deleted)`);

  // Restore
  await api.update({
    kod: cardKod,
    nazwiskoImie: afterInvalidate.nazwiskoImie,
    uniewazniono: undefined,
  });
  const afterRestore = await api.getByKod(cardKod);
  log(endpoint, `restore -> uniewazniono=${afterRestore.uniewazniono}`);
}

// ---------------------------------------------------------------------------
// READ_ONLY runners
// ---------------------------------------------------------------------------

async function runTowary(client: NoviCloudClient): Promise<void> {
  const api = client.towary();
  await runList(
    "towary",
    api.list(),
    (towar) => `id=${towar.id} kod=${towar.kod} nazwa=${towar.nazwa}`,
  );

  // getById for first item
  const items: { id?: number }[] = [];
  for await (const towar of api.list()) {
    items.push(towar);
    break;
  }
  if (items[0]?.id) {
    const single = await api.getById(items[0].id);
    log("towary", `getById(${items[0].id}) -> nazwa=${single.nazwa}`);
  }
}

async function runAsorty(client: NoviCloudClient): Promise<void> {
  const api = client.asorty();
  await runList("asorty", api.list(), (asorty) => `id=${asorty.id} nazwa=${asorty.nazwa}`);
}

async function runJmiary(client: NoviCloudClient): Promise<void> {
  const api = client.jmiary();
  await runList("jmiary", api.list(), (jmiara) => `id=${jmiara.id} nazwa=${jmiara.nazwa}`);
}

async function runStawkiVat(client: NoviCloudClient): Promise<void> {
  const api = client.stawkiVat();
  await runList(
    "stawkivat",
    api.list(),
    (stawka) => `id=${stawka.id} opis=${stawka.opis} etykieta=${stawka.etykieta}`,
  );
}

async function runWaluty(client: NoviCloudClient): Promise<void> {
  const api = client.waluty();
  await runList(
    "waluty",
    api.list(),
    (waluta) => `id=${waluta.id} nazwa=${waluta.nazwa} kurs=${waluta.kurs}`,
  );
}

async function runKraje(client: NoviCloudClient): Promise<void> {
  const api = client.kraje();
  await runList("kraje", api.list(), (kraj) => `id=${kraj.id} nazwa=${kraj.nazwa}`);
}

async function runFormyPlatn(client: NoviCloudClient): Promise<void> {
  const api = client.formyPlatn();
  await runList("formyplatn", api.list(), (forma) => `id=${forma.id} nazwa=${forma.nazwa}`);
}

async function runKontrahenci(client: NoviCloudClient): Promise<void> {
  const api = client.kontrahenci();
  await runList(
    "kontrahenci",
    api.list(),
    (kontrahent) => `id=${kontrahent.id} nazwa=${kontrahent.nazwa}`,
  );
}

async function runSklepy(client: NoviCloudClient): Promise<void> {
  const api = client.sklepy();
  await runList("sklepy", api.list(), (sklep) => `id=${sklep.id} nazwa=${sklep.nazwa}`);
}

async function runKasy(client: NoviCloudClient): Promise<void> {
  const api = client.kasy();
  await runList("kasy", api.list(), (kasa) => `id=${kasa.id} nazwa=${kasa.nazwa}`);
}

async function runKasjerzy(client: NoviCloudClient): Promise<void> {
  const api = client.kasjerzy();
  await runList("kasjerzy", api.list(), (kasjer) => `id=${kasjer.id} nazwisko=${kasjer.nazwisko}`);
}

async function runDokumenty(client: NoviCloudClient): Promise<void> {
  const api = client.dokumenty();
  await runList("dokumenty", api.list(), (dokument) => `id=${dokument.id} nrDok=${dokument.nrDok}`);
}

async function runPozdok(client: NoviCloudClient): Promise<void> {
  const api = client.pozdok();
  await runList(
    "pozdok",
    api.list(),
    (pozycja) => `id=${pozycja.id} nrPozycji=${pozycja.nrPozycji}`,
  );
}

async function runStanyMag(client: NoviCloudClient): Promise<void> {
  const api = client.stanyMag();
  await runList(
    "stanymag",
    api.list(),
    (stan) => `towar=${stan.towar?.id} sklep=${stan.sklep?.id} ilosc=${stan.ilosc}`,
  );
}

async function runSprzedaz(client: NoviCloudClient): Promise<void> {
  const api = client.sprzedaz();
  await runList("sprzedaz", api.list(), (sprzedaz) => `id=${sprzedaz.id} nrDok=${sprzedaz.nrDok}`);
}

async function runRapSprzed(client: NoviCloudClient): Promise<void> {
  const api = client.rapSprzed();
  await runList(
    "rapsprzed",
    api.list({ grupowanie: "towar" }),
    (raport) => `ilosc=${raport.ilosc} sprzBrutto=${raport.sprzBrutto} rabat=${raport.rabat}`,
  );
}

async function runRapPracy(client: NoviCloudClient): Promise<void> {
  const api = client.rapPracy();
  await runList(
    "rappracy",
    api.list({ grupowanie: "sklep" }),
    (raport) => `utarg=${raport.utarg} gotowka=${raport.gotowka} paragony=${raport.paragonyIlosc}`,
  );
}

async function runKartyLoj(client: NoviCloudClient): Promise<void> {
  const api = client.kartyLoj();
  await runList("kartyloj", api.list(), (karta) => `kod=${karta.kod} posiadacz=${karta.posiadacz}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`NoviCloud TS SDK Demo - mode=${MODE}`);
  console.log(`Account: ${ACCOUNT}`);
  console.log("=".repeat(SEPARATOR_WIDTH));

  const client = NoviCloudClient.create(ACCOUNT, PASSWORD, {
    baseUrl: BASE_URL,
  });

  // Phase 1: READ_ONLY - always runs (except CREATE_SOFT skips reads)
  if (MODE !== "CREATE_SOFT") {
    const runners: [string, (client: NoviCloudClient) => Promise<void>][] = [
      ["towary", runTowary],
      ["asorty", runAsorty],
      ["jmiary", runJmiary],
      ["stawkivat", runStawkiVat],
      ["waluty", runWaluty],
      ["kraje", runKraje],
      ["formyplatn", runFormyPlatn],
      ["kontrahenci", runKontrahenci],
      ["sklepy", runSklepy],
      ["kasy", runKasy],
      ["kasjerzy", runKasjerzy],
      ["dokumenty", runDokumenty],
      ["pozdok", runPozdok],
      ["stanymag", runStanyMag],
      ["sprzedaz", runSprzedaz],
      ["rapsprzed", runRapSprzed],
      ["rappracy", runRapPracy],
      ["kartyloj", runKartyLoj],
    ];

    for (const [name, runner] of runners) {
      console.log(`\n--- ${name.toUpperCase()} ---`);
      await safe(name, () => runner(client));
    }
  }

  // Phase 2: CRUD_SAFE - hard-delete endpoints
  if (MODE === "CRUD_SAFE" || MODE === "CRUD_ALL") {
    console.log("\n" + "=".repeat(SEPARATOR_WIDTH));
    console.log("CRUD: testing create/delete on hard-delete endpoints\n");

    const hardDeleteRunners: [string, (client: NoviCloudClient) => Promise<void>][] = [
      ["crud-asorty", runCrudAsorty],
      ["crud-jmiary", runCrudJmiary],
      ["crud-stawkivat", runCrudStawkiVat],
    ];

    for (const [name, runner] of hardDeleteRunners) {
      console.log(`\n--- ${name.toUpperCase()} ---`);
      await safe(name, () => runner(client));
    }
  }

  // Phase 3: CREATE_SOFT - create one record per soft-delete endpoint
  if (MODE === "CREATE_SOFT") {
    console.log("CREATE_SOFT: creating test records for soft-delete endpoints\n");

    const ids: SoftDeleteIds = {};
    const createRunners: [string, (client: NoviCloudClient, ids: SoftDeleteIds) => Promise<void>][] = [
      ["create-soft-towary", runCreateSoftTowary],
      ["create-soft-waluty", runCreateSoftWaluty],
      ["create-soft-kontrahenci", runCreateSoftKontrahenci],
      ["create-soft-sklepy", runCreateSoftSklepy],
      ["create-soft-formyplatn", runCreateSoftFormyPlatn],
      ["create-soft-kartyloj", runCreateSoftKartyLoj],
    ];

    for (const [name, runner] of createRunners) {
      console.log(`\n--- ${name.toUpperCase()} ---`);
      await safe(name, () => runner(client, ids));
    }

    await saveSoftDeleteIds(ids);
  }

  // Phase 4: CRUD_ALL - full CRUD on soft-delete endpoints using saved IDs
  if (MODE === "CRUD_ALL") {
    console.log("\n" + "=".repeat(SEPARATOR_WIDTH));
    console.log("CRUD_ALL: testing update/delete/restore on soft-delete endpoints\n");

    const ids = await loadSoftDeleteIds();

    const softDeleteRunners: [string, (client: NoviCloudClient, ids: SoftDeleteIds) => Promise<void>][] = [
      ["crud-all-towary", runCrudAllTowary],
      ["crud-all-waluty", runCrudAllWaluty],
      ["crud-all-kontrahenci", runCrudAllKontrahenci],
      ["crud-all-sklepy", runCrudAllSklepy],
      ["crud-all-formyplatn", runCrudAllFormyPlatn],
      ["crud-all-kartyloj", runCrudAllKartyLoj],
    ];

    for (const [name, runner] of softDeleteRunners) {
      console.log(`\n--- ${name.toUpperCase()} ---`);
      await safe(name, () => runner(client, ids));
    }
  }

  console.log("\n" + "=".repeat(SEPARATOR_WIDTH));
  console.log("Demo complete.");
  client.close();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
