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

// Custom retry policy
const client = NoviCloudClient.create("demo", "demo", {
  retryPolicy: {
    enabled: true,
    maxAttempts: 5,
    backoffStrategy: "exponential",
    retryOn429: true,
    retryOn5xx: true,
    retryPost: false, // do not retry POST requests
    maxRetryAfterSeconds: 120,
  },
});

try {
  await client.towary().getById(999999);
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
  }
}

client.close();
