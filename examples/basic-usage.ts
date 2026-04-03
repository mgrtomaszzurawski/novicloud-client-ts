/**
 * Basic usage example - list products, get by ID, paginate
 *
 * Run: NOVICLOUD_ACCOUNT=xxx NOVICLOUD_PASSWORD=yyy npx tsx examples/basic-usage.ts
 */

import { NoviCloudClient } from "../src/index.js";

const ACCOUNT = process.env.NOVICLOUD_ACCOUNT!;
const PASSWORD = process.env.NOVICLOUD_PASSWORD!;

const client = NoviCloudClient.create(ACCOUNT, PASSWORD);

// List first 5 products
const products = client.towary().list({ aktywny: true });
let productCount = 0;
for await (const product of products) {
  console.log(`Product: ${product.kod} - ${product.nazwa} (VAT: ${product.stawkaVat})`);
  productCount++;
  if (productCount >= 5) break;
}

// Get total count
const totalProducts = await client.towary().count();
console.log(`\nTotal active products: ${totalProducts}`);

// Get single product by ID
const firstProduct = await client.towary().getById(1);
console.log(`\nProduct #1: ${firstProduct.nazwa}`);

client.close();
