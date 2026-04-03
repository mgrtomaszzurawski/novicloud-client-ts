/**
 * CRUD operations example - create, read, update, delete
 *
 * Run: NOVICLOUD_ACCOUNT=xxx NOVICLOUD_PASSWORD=yyy npx tsx examples/crud-operations.ts
 *
 * WARNING: This example creates and deletes real data on the server.
 * Uses hard-delete endpoints (asorty) so records are fully removed.
 */

import { NoviCloudClient } from "../src/index.js";

const ACCOUNT = process.env.NOVICLOUD_ACCOUNT!;
const PASSWORD = process.env.NOVICLOUD_PASSWORD!;

const client = NoviCloudClient.create(ACCOUNT, PASSWORD);
const asorty = client.asorty();

// Create
const createdId = await asorty.create({ nazwa: "SDK Example Group" } as never);
console.log(`Created assortment group: id=${createdId}`);

if (createdId) {
  const numericId = parseInt(createdId, 10);

  // Read
  const fetched = await asorty.getById(numericId);
  console.log(`Fetched: id=${fetched.id} nazwa=${fetched.nazwa}`);

  // Update
  await asorty.update({ id: numericId, nazwa: "SDK Example Group (updated)" } as never);
  const updated = await asorty.getById(numericId);
  console.log(`Updated: nazwa=${updated.nazwa}`);

  // Delete (hard-delete - record is permanently removed)
  await asorty.deleteById(numericId);
  console.log(`Deleted: id=${numericId} (hard-delete)`);
}

// Soft-delete example (towary)
// Soft-delete sets aktywny=false, record stays in database
// To reactivate: client.towary().update({ id: 42, aktywny: true })
console.log("\nSoft-delete endpoints (towary, waluty, kontrahenci, sklepy, formyplatn):");
console.log("  deleteById() sets aktywny=false, update({ aktywny: true }) to reactivate");

client.close();
