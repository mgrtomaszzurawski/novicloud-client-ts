/**
 * Filtered queries example - typed per-endpoint query parameters
 *
 * Run: NOVICLOUD_ACCOUNT=xxx NOVICLOUD_PASSWORD=yyy npx tsx examples/filtered-queries.ts
 */

import { NoviCloudClient } from "../src/index.js";

const ACCOUNT = process.env.NOVICLOUD_ACCOUNT!;
const PASSWORD = process.env.NOVICLOUD_PASSWORD!;

const client = NoviCloudClient.create(ACCOUNT, PASSWORD);

// Full-text search across products
console.log("--- Full-text search: 'jabłko' ---");
for await (const product of client.towary().list({ fts: "jabłko" })) {
  console.log(`  ${product.kod} - ${product.nazwa}`);
}

// Filter by VAT rate (2300 = 23%)
console.log("\n--- Products with 23% VAT ---");
let vatCount = 0;
for await (const product of client.towary().list({ stawkaVat: 2300 })) {
  console.log(`  ${product.kod} - ${product.nazwa}`);
  vatCount++;
  if (vatCount >= 5) break;
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
  if (reportCount >= 5) break;
}

// Work reports grouped by shop
console.log("\n--- Work report (grouped by shop) ---");
let workCount = 0;
for await (const report of client.rapPracy().list({ grupowanie: "sklep" })) {
  console.log(`  revenue=${report.utarg} cash=${report.gotowka} receipts=${report.paragonyIlosc}`);
  workCount++;
  if (workCount >= 3) break;
}

client.close();
