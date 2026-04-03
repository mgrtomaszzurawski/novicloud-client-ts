/**
 * Pagination example - async iteration, seek, fetchFrom, bidirectional
 *
 * Run: NOVICLOUD_ACCOUNT=xxx NOVICLOUD_PASSWORD=yyy npx tsx examples/pagination.ts
 */

import { NoviCloudClient } from "../src/index.js";

const ACCOUNT = process.env.NOVICLOUD_ACCOUNT!;
const PASSWORD = process.env.NOVICLOUD_PASSWORD!;

const client = NoviCloudClient.create(ACCOUNT, PASSWORD);

const result = client.towary().list();

// Total count (triggers first page fetch)
const totalCount = await result.totalCount();
const pageSize = await result.pageSize();
console.log(`Total: ${totalCount}, page size: ${pageSize}`);

// Async iteration - fetches pages automatically
console.log("\n--- First 3 items via async iteration ---");
let iterationIndex = 0;
for await (const product of result) {
  console.log(`  [${iterationIndex}] ${product.kod} - ${product.nazwa}`);
  iterationIndex++;
  if (iterationIndex >= 3) break;
}

// Random access - jump to record 50
if (totalCount > 50) {
  console.log("\n--- Seek to position 50 ---");
  result.seek(50);
  const iterator = result.asyncListIterator();
  const { value: recordAtFifty } = await iterator.next();
  console.log(`  Record at 50: ${recordAtFifty.kod} - ${recordAtFifty.nazwa}`);

  // Go back one
  const { value: previousRecord } = await iterator.previous();
  console.log(`  Previous: ${previousRecord.kod} - ${previousRecord.nazwa}`);
}

// Fetch a specific page range
console.log("\n--- fetchFrom(0) - first page ---");
const firstPage = await result.fetchFrom(0);
for (const product of firstPage) {
  console.log(`  ${product.kod}`);
}

client.close();
