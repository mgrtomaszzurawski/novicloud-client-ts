/**
 * NoviCloud TypeScript SDK Demo App
 *
 * Exercises all 18 endpoints. Two modes:
 *   READ_ONLY  - list + getById only (default)
 *   CRUD_SAFE  - additionally tests create/update/delete on hard-delete endpoints
 *                (asorty, jmiary, kraje) where records are fully removed after delete
 *
 * Usage:
 *   NOVICLOUD_ACCOUNT=your_account NOVICLOUD_PASSWORD=your_pass npx tsx demo/demo.ts
 *
 * Optional:
 *   NOVICLOUD_BASE_URL=https://system.novicloud.pl/rest/api  (default)
 *   DEMO_MODE=READ_ONLY|CRUD_SAFE  (default: READ_ONLY)
 */

import { NoviCloudClient, NoviCloudError, type PagedResult } from "../src/index.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ACCOUNT = process.env.NOVICLOUD_ACCOUNT;
const PASSWORD = process.env.NOVICLOUD_PASSWORD;
const BASE_URL = process.env.NOVICLOUD_BASE_URL;
const MODE = (process.env.DEMO_MODE ?? "READ_ONLY").toUpperCase();

if (!ACCOUNT || !PASSWORD) {
  console.error("Set NOVICLOUD_ACCOUNT and NOVICLOUD_PASSWORD env vars.");
  process.exit(1);
}

const LIST_LIMIT = 3;
const SEEK_POSITION = 76;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(endpoint: string, msg: string): void {
  console.log(`[${endpoint}] ${msg}`);
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
    const iter = result.asyncListIterator();
    const { value, done } = await iter.next();
    if (!done) {
      log(endpoint, `seek(${SEEK_POSITION}) -> ${label(value)}`);
    }
  } else {
    log(endpoint, `seek(${SEEK_POSITION}) -> skipped (totalCount=${count})`);
  }
}

async function safe(endpoint: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    log(endpoint, "PASSED");
  } catch (err) {
    if (err instanceof NoviCloudError) {
      log(endpoint, `FAILED: ${err.name} ${err.statusCode} - ${err.message}`);
    } else {
      log(endpoint, `FAILED: ${err}`);
    }
  }
}

// ---------------------------------------------------------------------------
// CRUD_SAFE test data - unique names to avoid collisions
// ---------------------------------------------------------------------------

const CRUD_TIMESTAMP = Date.now();
const CRUD_ASORTY_NAME = `sdk-test-asorty-${CRUD_TIMESTAMP}`;
const CRUD_JMIARY_NAME = `sdk-test-jm-${CRUD_TIMESTAMP}`;
const CRUD_KRAJE_NAME = `SDK-Test-${CRUD_TIMESTAMP}`;
const CRUD_KRAJE_KOD = `T${String(CRUD_TIMESTAMP).slice(-2)}`;

// ---------------------------------------------------------------------------
// CRUD_SAFE runners (create -> read -> update -> delete cycle)
// ---------------------------------------------------------------------------

async function runCrudAsorty(client: NoviCloudClient): Promise<void> {
  const api = client.asorty();
  log("crud-asorty", "create...");
  const createdId = await api.create({ nazwa: CRUD_ASORTY_NAME } as never);
  log("crud-asorty", `created -> id=${createdId}`);

  if (!createdId) {
    log("crud-asorty", "SKIP: create returned no id");
    return;
  }

  const numericId = parseInt(createdId, 10);
  const fetched = await api.getById(numericId);
  log("crud-asorty", `getById(${numericId}) -> nazwa=${fetched.nazwa}`);

  const updatedName = `${CRUD_ASORTY_NAME}-updated`;
  await api.update({ id: numericId, nazwa: updatedName } as never);
  const afterUpdate = await api.getById(numericId);
  log("crud-asorty", `update -> nazwa=${afterUpdate.nazwa}`);

  await api.deleteById(numericId);
  log("crud-asorty", `deleteById(${numericId}) -> hard-deleted`);
}

async function runCrudJmiary(client: NoviCloudClient): Promise<void> {
  const api = client.jmiary();
  log("crud-jmiary", "create...");
  const createdId = await api.create({ nazwa: CRUD_JMIARY_NAME, precyzja: 2 } as never);
  log("crud-jmiary", `created -> id=${createdId}`);

  if (!createdId) {
    log("crud-jmiary", "SKIP: create returned no id");
    return;
  }

  const numericId = parseInt(createdId, 10);
  const fetched = await api.getById(numericId);
  log("crud-jmiary", `getById(${numericId}) -> nazwa=${fetched.nazwa} precyzja=${fetched.precyzja}`);

  const updatedName = `${CRUD_JMIARY_NAME}-upd`;
  await api.update({ id: numericId, nazwa: updatedName, precyzja: 3 } as never);
  const afterUpdate = await api.getById(numericId);
  log("crud-jmiary", `update -> nazwa=${afterUpdate.nazwa} precyzja=${afterUpdate.precyzja}`);

  await api.deleteById(numericId);
  log("crud-jmiary", `deleteById(${numericId}) -> hard-deleted`);
}

async function runCrudKraje(client: NoviCloudClient): Promise<void> {
  const api = client.kraje();
  log("crud-kraje", "create...");
  const createdId = await api.create({ nazwa: CRUD_KRAJE_NAME, kod: CRUD_KRAJE_KOD } as never);
  log("crud-kraje", `created -> id=${createdId}`);

  if (!createdId) {
    log("crud-kraje", "SKIP: create returned no id");
    return;
  }

  const numericId = parseInt(createdId, 10);
  const fetched = await api.getById(numericId);
  log("crud-kraje", `getById(${numericId}) -> nazwa=${fetched.nazwa} kod=${fetched.kod}`);

  const updatedName = `${CRUD_KRAJE_NAME}-upd`;
  await api.update({ id: numericId, nazwa: updatedName, kod: CRUD_KRAJE_KOD } as never);
  const afterUpdate = await api.getById(numericId);
  log("crud-kraje", `update -> nazwa=${afterUpdate.nazwa}`);

  await api.deleteById(numericId);
  log("crud-kraje", `deleteById(${numericId}) -> hard-deleted`);
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
  console.log("=".repeat(60));

  const client = NoviCloudClient.create(ACCOUNT, PASSWORD, {
    baseUrl: BASE_URL,
  });

  const runners: [string, (c: NoviCloudClient) => Promise<void>][] = [
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

  // CRUD_SAFE: create -> read -> update -> delete on hard-delete endpoints
  if (MODE === "CRUD_SAFE") {
    console.log("\n" + "=".repeat(60));
    console.log("CRUD_SAFE: testing create/update/delete on hard-delete endpoints\n");

    const crudRunners: [string, (c: NoviCloudClient) => Promise<void>][] = [
      ["crud-asorty", runCrudAsorty],
      ["crud-jmiary", runCrudJmiary],
      ["crud-kraje", runCrudKraje],
    ];

    for (const [crudName, crudRunner] of crudRunners) {
      console.log(`\n--- ${crudName.toUpperCase()} ---`);
      await safe(crudName, () => crudRunner(client));
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Demo complete.");
  client.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
