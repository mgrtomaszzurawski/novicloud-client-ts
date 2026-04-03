/**
 * Pagination example - async iteration, seek, fetchFrom, bidirectional
 *
 * Run: NOVICLOUD_ACCOUNT=xxx NOVICLOUD_PASSWORD=yyy npx tsx examples/pagination.ts
 */

import { NoviCloudClient } from "../src/index.js";

const ACCOUNT = process.env.NOVICLOUD_ACCOUNT;
const PASSWORD = process.env.NOVICLOUD_PASSWORD;

if (!ACCOUNT || !PASSWORD) {
  console.error("Set NOVICLOUD_ACCOUNT and NOVICLOUD_PASSWORD env vars.");
  process.exit(1);
}

const PREVIEW_COUNT = 3;
const SEEK_OFFSET = 50;

const client = NoviCloudClient.create(ACCOUNT, PASSWORD);

try {
  const result = client.towary().list();

  // Total count (triggers first page fetch)
  const totalCount = await result.totalCount();
  const pageSize = await result.pageSize();
  console.log(`Total: ${totalCount}, page size: ${pageSize}`);

  // Async iteration - fetches pages automatically
  console.log("\n--- First items via async iteration ---");
  let displayedCount = 0;
  for await (const product of result) {
    console.log(`  [${displayedCount}] ${product.kod} - ${product.nazwa}`);
    displayedCount++;
    if (displayedCount >= PREVIEW_COUNT) break;
  }

  // Random access - jump to specific record
  if (totalCount > SEEK_OFFSET) {
    console.log(`\n--- Seek to position ${SEEK_OFFSET} ---`);
    result.seek(SEEK_OFFSET);
    const iterator = result.asyncListIterator();

    const nextResult = await iterator.next();
    if (!nextResult.done) {
      console.log(`  Record at ${SEEK_OFFSET}: ${nextResult.value.kod} - ${nextResult.value.nazwa}`);
    }

    // Go back one
    const previousResult = await iterator.previous();
    if (!previousResult.done) {
      console.log(`  Previous: ${previousResult.value.kod} - ${previousResult.value.nazwa}`);
    }
  }

  // Fetch a specific page range
  console.log("\n--- fetchFrom(0) - first page ---");
  const firstPage = await result.fetchFrom(0);
  for (const product of firstPage) {
    console.log(`  ${product.kod}`);
  }
} finally {
  client.close();
}
