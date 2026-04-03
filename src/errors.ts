/**
 * NoviCloud SDK error hierarchy.
 *
 * All SDK errors extend {@link NoviCloudError}, which extends the native `Error`.
 * Use `instanceof` to handle specific error types:
 *
 * ```ts
 * try {
 *   await client.towary().getById(999);
 * } catch (e) {
 *   if (e instanceof NoviCloudRateLimitError) {
 *     console.log(`Retry after ${e.retryAfterSeconds}s`);
 *   } else if (e instanceof NoviCloudNotFoundError) {
 *     console.log('Not found');
 *   }
 * }
 * ```
 *
 * Mapping:
 * - 401, 403 -> {@link NoviCloudAuthError}
 * - 404, 410 -> {@link NoviCloudNotFoundError}
 * - 429 -> {@link NoviCloudRateLimitError} (parses Retry-After header)
 * - 5xx -> {@link NoviCloudServerError}
 * - Network/fetch failures -> {@link NoviCloudNetworkError} (statusCode = 0)
 *
 * @module
 */

/**
 * Base error for all NoviCloud SDK errors.
 *
 * Carries the HTTP status code and raw response body for diagnostics.
 * Use the static factories {@link NoviCloudError.of} and {@link NoviCloudError.network}
 * to create properly typed instances.
 */
export class NoviCloudError extends Error {
  /** HTTP status code (0 if no response was received). */
  readonly statusCode: number;
  /** Raw response body, if available. May contain sensitive data on 400 responses. */
  readonly responseBody: string | undefined;

  constructor(message: string, cause: unknown, statusCode: number, responseBody?: string) {
    super(message, { cause });
    this.name = "NoviCloudError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }

  /**
   * Create a typed error from an HTTP response.
   *
   * Maps the response status code to the appropriate error subclass.
   * Reads the response body for diagnostics.
   *
   * @param message - Human-readable error context (e.g. "Failed to fetch towar by id")
   * @param response - The HTTP Response object
   * @returns Typed error subclass based on status code
   */
  static async of(message: string, response: Response): Promise<NoviCloudError> {
    const code = response.status;
    let body: string | undefined;
    try {
      body = await response.text();
    } catch {
      // ignore read failures
    }

    if (code === 401 || code === 403) {
      return new NoviCloudAuthError(message, undefined, code, body);
    }
    if (code === 404 || code === 410) {
      return new NoviCloudNotFoundError(message, undefined, code, body);
    }
    if (code === 429) {
      const retryAfter = parseRetryAfter(response.headers);
      return new NoviCloudRateLimitError(message, undefined, code, body, retryAfter);
    }
    if (code >= 500) {
      return new NoviCloudServerError(message, undefined, code, body);
    }
    return new NoviCloudError(message, undefined, code, body);
  }

  /**
   * Create a network error (no HTTP response available).
   *
   * Used for fetch failures, DNS errors, connection refused, timeouts, etc.
   * The resulting error has statusCode = 0.
   *
   * @param message - Human-readable error context
   * @param cause - The original error (e.g. TypeError from fetch)
   */
  static network(message: string, cause: unknown): NoviCloudNetworkError {
    return new NoviCloudNetworkError(message, cause, 0, undefined);
  }
}

/** Authentication error (HTTP 401 Unauthorized, 403 Forbidden). */
export class NoviCloudAuthError extends NoviCloudError {
  constructor(message: string, cause: unknown, statusCode: number, responseBody?: string) {
    super(message, cause, statusCode, responseBody);
    this.name = "NoviCloudAuthError";
  }
}

/** Resource not found (HTTP 404 Not Found, 410 Gone). */
export class NoviCloudNotFoundError extends NoviCloudError {
  constructor(message: string, cause: unknown, statusCode: number, responseBody?: string) {
    super(message, cause, statusCode, responseBody);
    this.name = "NoviCloudNotFoundError";
  }
}

/**
 * Rate limit exceeded (HTTP 429 Too Many Requests).
 *
 * The {@link retryAfterSeconds} field contains the parsed value of the
 * `Retry-After` response header (0 if the header is absent or unparseable).
 * The SDK's {@link RetryHandler} automatically respects this value.
 */
export class NoviCloudRateLimitError extends NoviCloudError {
  /** Seconds to wait before retrying, from the Retry-After header. 0 if absent. */
  readonly retryAfterSeconds: number;

  constructor(
    message: string,
    cause: unknown,
    statusCode: number,
    responseBody: string | undefined,
    retryAfterSeconds: number,
  ) {
    super(message, cause, statusCode, responseBody);
    this.name = "NoviCloudRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Server error (HTTP 5xx). */
export class NoviCloudServerError extends NoviCloudError {
  constructor(message: string, cause: unknown, statusCode: number, responseBody?: string) {
    super(message, cause, statusCode, responseBody);
    this.name = "NoviCloudServerError";
  }
}

/** Network/connection error (fetch failure, DNS, timeout). StatusCode is always 0. */
export class NoviCloudNetworkError extends NoviCloudError {
  constructor(message: string, cause: unknown, statusCode: number, responseBody?: string) {
    super(message, cause, statusCode, responseBody);
    this.name = "NoviCloudNetworkError";
  }
}

function parseRetryAfter(headers: Headers): number {
  const value = headers.get("Retry-After");
  if (value == null) return 0;
  const parsed = parseInt(value.trim(), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}
