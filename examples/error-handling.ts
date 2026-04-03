/**
 * Error handling example - typed errors and retry configuration
 *
 * Run: NOVICLOUD_ACCOUNT=xxx NOVICLOUD_PASSWORD=yyy npx tsx examples/error-handling.ts
 */

import {
  NoviCloudClient,
  NoviCloudAuthError,
  NoviCloudNotFoundError,
  NoviCloudRateLimitError,
  NoviCloudServerError,
  NoviCloudNetworkError,
} from "../src/index.js";

const ACCOUNT = process.env.NOVICLOUD_ACCOUNT;
const PASSWORD = process.env.NOVICLOUD_PASSWORD;

if (!ACCOUNT || !PASSWORD) {
  console.error("Set NOVICLOUD_ACCOUNT and NOVICLOUD_PASSWORD env vars.");
  process.exit(1);
}

const RETRY_MAX_ATTEMPTS = 5;
const RETRY_MAX_AFTER_SECONDS = 120;
const NON_EXISTENT_PRODUCT_ID = 999999;

// Custom retry policy
const client = NoviCloudClient.create(ACCOUNT, PASSWORD, {
  retryPolicy: {
    enabled: true,
    maxAttempts: RETRY_MAX_ATTEMPTS,
    backoffStrategy: "exponential",
    retryOn429: true,
    retryOn5xx: true,
    retryPost: false,
    maxRetryAfterSeconds: RETRY_MAX_AFTER_SECONDS,
  },
});

try {
  await client.towary().getById(NON_EXISTENT_PRODUCT_ID);
} catch (error) {
  if (error instanceof NoviCloudNotFoundError) {
    console.log(`Not found (${error.statusCode}): ${error.message}`);
  } else if (error instanceof NoviCloudAuthError) {
    console.log(`Auth error (${error.statusCode}): check credentials`);
  } else if (error instanceof NoviCloudRateLimitError) {
    console.log(`Rate limited: retry after ${error.retryAfterSeconds}s`);
  } else if (error instanceof NoviCloudServerError) {
    console.log(`Server error (${error.statusCode}): ${error.message}`);
  } else if (error instanceof NoviCloudNetworkError) {
    console.log(`Network error: ${error.message}`);
  } else {
    throw error;
  }
} finally {
  client.close();
}
