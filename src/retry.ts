import { NoviCloudError, NoviCloudRateLimitError, NoviCloudServerError } from "./errors.js";
import { ResponseError, FetchError } from "./generated/src/runtime.js";

// ---------------------------------------------------------------------------
// RetryPolicy
// ---------------------------------------------------------------------------

/** Backoff strategy for retry delays. "exponential" doubles each attempt (1,2,4,8s), "fixed" uses 1s always. */
export type BackoffStrategy = "exponential" | "fixed";

/**
 * Configuration for the SDK retry behavior.
 *
 * All fields have sensible defaults. Create via {@link retryPolicy} or {@link defaultRetryPolicy}.
 *
 * @example
 * ```ts
 * const client = NoviCloudClient.create('account', 'password', {
 *   retryPolicy: { maxAttempts: 5, retryPost: false },
 * });
 * ```
 */
export interface RetryPolicy {
  /** Master switch. Default: true */
  readonly enabled: boolean;
  /** Retry on 5xx. Default: true */
  readonly retryOn5xx: boolean;
  /** Max attempts (>= 1). Default: 3 */
  readonly maxAttempts: number;
  /** Backoff strategy. Default: "exponential" */
  readonly backoffStrategy: BackoffStrategy;
  /** Retry on 429. Default: true */
  readonly retryOn429: boolean;
  /** Max seconds to honour from Retry-After header. Default: 60 */
  readonly maxRetryAfterSeconds: number;
  /** Retry POST/create on 5xx. Default: true */
  readonly retryPost: boolean;
}

const DEFAULT_POLICY: RetryPolicy = {
  enabled: true,
  retryOn5xx: true,
  maxAttempts: 3,
  backoffStrategy: "exponential",
  retryOn429: true,
  maxRetryAfterSeconds: 60,
  retryPost: true,
};

/** Returns a copy of the default retry policy (all retries enabled, 3 attempts, exponential backoff). */
export function defaultRetryPolicy(): RetryPolicy {
  return { ...DEFAULT_POLICY };
}

/**
 * Create a retry policy with custom overrides merged onto defaults.
 *
 * @param overrides - Fields to override (unspecified fields use defaults)
 * @throws Error if maxAttempts < 1 or maxRetryAfterSeconds <= 0
 */
export function retryPolicy(overrides: Partial<RetryPolicy>): RetryPolicy {
  const merged = { ...DEFAULT_POLICY, ...overrides };
  if (merged.maxAttempts < 1) {
    throw new Error(`maxAttempts must be >= 1, got: ${merged.maxAttempts}`);
  }
  if (merged.maxRetryAfterSeconds <= 0) {
    throw new Error(`maxRetryAfterSeconds must be positive, got: ${merged.maxRetryAfterSeconds}`);
  }
  return merged;
}

// ---------------------------------------------------------------------------
// RetryHandler
// ---------------------------------------------------------------------------

const MILLIS_PER_SECOND = 1000;
const BASE_BACKOFF_SECONDS = 1;

/**
 * Wraps API calls with configurable retry logic.
 *
 * Retries on 429 (rate limit) and 5xx (server error) based on {@link RetryPolicy}.
 * Uses exponential or fixed backoff with jitter to avoid thundering herd.
 * Respects the Retry-After header on 429 responses (capped at maxRetryAfterSeconds).
 * Non-retryable errors (4xx except 429) are thrown immediately.
 */
export class RetryHandler {
  private readonly policy: RetryPolicy;

  constructor(policy?: RetryPolicy) {
    this.policy = policy ?? defaultRetryPolicy();
  }

  /** Execute a GET-like call with retry. */
  async execute<T>(call: () => Promise<T>, message: string): Promise<T> {
    return this.executeInternal(call, message, false);
  }

  /** Execute a POST/create call with retry (respects retryPost policy). */
  async executePost<T>(call: () => Promise<T>, message: string): Promise<T> {
    return this.executeInternal(call, message, true);
  }

  /** Execute a void call (PUT/DELETE) with retry. */
  async run(call: () => Promise<void>, message: string): Promise<void> {
    await this.execute(call, message);
  }

  private async executeInternal<T>(
    call: () => Promise<T>,
    message: string,
    isPost: boolean,
  ): Promise<T> {
    if (!this.policy.enabled) {
      try {
        return await call();
      } catch (err) {
        throw await mapError(message, err);
      }
    }

    const maxAttempts = Math.max(1, this.policy.maxAttempts);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await call();
      } catch (err) {
        const sdkError = await mapError(message, err);
        const hasMore = attempt < maxAttempts - 1;

        if (sdkError instanceof NoviCloudRateLimitError && this.policy.retryOn429 && hasMore) {
          const preferred = Math.min(sdkError.retryAfterSeconds, this.policy.maxRetryAfterSeconds);
          await sleep(preferred, attempt, this.policy.backoffStrategy);
          continue;
        }

        if (
          sdkError instanceof NoviCloudServerError &&
          this.policy.retryOn5xx &&
          this.shouldRetry5xx(isPost) &&
          hasMore
        ) {
          await sleep(0, attempt, this.policy.backoffStrategy);
          continue;
        }

        throw sdkError;
      }
    }

    throw new Error("Unreachable: retry loop exhausted without throwing");
  }

  private shouldRetry5xx(isPost: boolean): boolean {
    return !isPost || this.policy.retryPost;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function mapError(message: string, err: unknown): Promise<NoviCloudError> {
  if (err instanceof ResponseError) {
    return NoviCloudError.of(message, err.response);
  }
  if (err instanceof FetchError) {
    return NoviCloudError.network(message, err.cause);
  }
  if (err instanceof NoviCloudError) {
    return err;
  }
  return NoviCloudError.network(message, err);
}

function sleep(
  preferredSeconds: number,
  attempt: number,
  strategy: BackoffStrategy,
): Promise<void> {
  let baseSeconds: number;
  if (preferredSeconds > 0) {
    baseSeconds = preferredSeconds;
  } else if (strategy === "exponential") {
    baseSeconds = 1 << attempt; // 1, 2, 4, 8, ...
  } else {
    baseSeconds = BASE_BACKOFF_SECONDS;
  }

  const baseMillis = baseSeconds * MILLIS_PER_SECOND;
  // Jitter: random value in [base/2, base]
  const jitteredMillis =
    Math.floor(baseMillis / 2) + Math.floor(Math.random() * (baseMillis / 2 + 1));

  return new Promise((resolve) => setTimeout(resolve, jitteredMillis));
}
