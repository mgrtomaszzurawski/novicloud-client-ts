/**
 * Filtered queries example - typed per-endpoint query parameters
 *
 * Run: NOVICLOUD_ACCOUNT=xxx NOVICLOUD_PASSWORD=yyy npx tsx examples/filtered-queries.ts
 */

import { NoviCloudClient } from "../src/index.js";

const ACCOUNT = process.env.NOVICLOUD_ACCOUNT;
const PASSWORD = process.env.NOVICLOUD_PASSWORD;

if (!ACCOUNT || !PASSWORD) {
  console.error("Set NOVICLOUD_ACCOUNT and NOVICLOUD_PASSWORD env vars.");
  process.exit(1);
}

const DISPLAY_LIMIT = 5;
const WORK_REPORT_LIMIT = 3;
/** VAT rate in hundredths: 2300 = 23% (server encoding convention) */
const VAT_RATE_23_PERCENT = 2300;

const client = NoviCloudClient.create(ACCOUNT, PASSWORD);

try {
  // Full-text search across products
  console.log("--- Full-text search: 'jabłko' ---");
  for await (const product of client.towary().list({ fts: "jabłko" })) {
    console.log(`  ${product.kod} - ${product.nazwa}`);
  }

  // Filter by VAT rate
  console.log(`\n--- Products with 23% VAT (stawkaVat=${VAT_RATE_23_PERCENT}) ---`);
  let vatCount = 0;
  for await (const product of client.towary().list({ stawkaVat: VAT_RATE_23_PERCENT })) {
    console.log(`  ${product.kod} - ${product.nazwa}`);
    vatCount++;
    if (vatCount >= DISPLAY_LIMIT) break;
  }

  // Active products only
  console.log("\n--- Active products count ---");
  const activeCount = await client.towary().count({ aktywny: true });
  console.log(`  ${activeCount} active products`);

  // Sales reports grouped by product
  console.log("\n--- Sales report (grouped by product) ---");
  let reportCount = 0;
  for await (const report of client.rapSprzed().list({ grupowanie: "towar" })) {
    console.log(`  qty=${report.ilosc} gross=${report.sprzBrutto} discount=${report.rabat}`);
    reportCount++;
    if (reportCount >= DISPLAY_LIMIT) break;
  }

  // Work reports grouped by shop
  console.log("\n--- Work report (grouped by shop) ---");
  let workCount = 0;
  for await (const report of client.rapPracy().list({ grupowanie: "sklep" })) {
    console.log(
      `  revenue=${report.utarg} cash=${report.gotowka} receipts=${report.paragonyIlosc}`,
    );
    workCount++;
    if (workCount >= WORK_REPORT_LIMIT) break;
  }
} finally {
  client.close();
}
