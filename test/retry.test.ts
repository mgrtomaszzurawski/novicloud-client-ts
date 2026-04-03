import { describe, it, expect } from "vitest";
import { RetryHandler, retryPolicy, defaultRetryPolicy } from "../src/retry.js";
import { ResponseError } from "../src/generated/src/runtime.js";
import { NoviCloudError, NoviCloudServerError } from "../src/errors.js";

function mockResponseError(status: number, headers?: Record<string, string>): ResponseError {
  const response = new Response("", { status, headers });
  return new ResponseError(response, "test error");
}

describe("RetryPolicy", () => {
  it("defaultRetryPolicy returns sensible defaults", () => {
    const p = defaultRetryPolicy();
    expect(p.enabled).toBe(true);
    expect(p.retryOn5xx).toBe(true);
    expect(p.maxAttempts).toBe(3);
    expect(p.backoffStrategy).toBe("exponential");
    expect(p.retryOn429).toBe(true);
    expect(p.maxRetryAfterSeconds).toBe(60);
    expect(p.retryPost).toBe(true);
  });

  it("retryPolicy validates maxAttempts >= 1", () => {
    expect(() => retryPolicy({ maxAttempts: 0 })).toThrow("maxAttempts must be >= 1");
  });

  it("retryPolicy validates maxRetryAfterSeconds > 0", () => {
    expect(() => retryPolicy({ maxRetryAfterSeconds: 0 })).toThrow(
      "maxRetryAfterSeconds must be positive",
    );
  });

  it("retryPolicy merges overrides", () => {
    const p = retryPolicy({ maxAttempts: 5, retryOn429: false });
    expect(p.maxAttempts).toBe(5);
    expect(p.retryOn429).toBe(false);
    expect(p.retryOn5xx).toBe(true); // default preserved
  });
});

describe("RetryHandler", () => {
  it("execute returns value on success", async () => {
    const handler = new RetryHandler(retryPolicy({ enabled: false }));
    const result = await handler.execute(() => Promise.resolve(42), "test");
    expect(result).toBe(42);
  });

  it("execute wraps ResponseError into NoviCloudError", async () => {
    const handler = new RetryHandler(retryPolicy({ enabled: false }));
    await expect(
      handler.execute(() => Promise.reject(mockResponseError(404)), "not found"),
    ).rejects.toThrow(NoviCloudError);
  });

  it("execute maps 500 to NoviCloudServerError", async () => {
    const handler = new RetryHandler(retryPolicy({ enabled: false }));
    await expect(
      handler.execute(() => Promise.reject(mockResponseError(500)), "server err"),
    ).rejects.toBeInstanceOf(NoviCloudServerError);
  });

  it("retries on 5xx up to maxAttempts", async () => {
    const handler = new RetryHandler(
      retryPolicy({ maxAttempts: 3, retryOn5xx: true, backoffStrategy: "fixed" }),
    );
    let attempts = 0;
    const call = () => {
      attempts++;
      if (attempts < 3) return Promise.reject(mockResponseError(500));
      return Promise.resolve("ok");
    };

    const result = await handler.execute(call, "retry test");
    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("does not retry when disabled", async () => {
    const handler = new RetryHandler(retryPolicy({ enabled: false }));
    let attempts = 0;
    const call = () => {
      attempts++;
      return Promise.reject(mockResponseError(500));
    };

    await expect(handler.execute(call, "no retry")).rejects.toBeInstanceOf(NoviCloudServerError);
    expect(attempts).toBe(1);
  });

  it("does not retry 4xx (except 429)", async () => {
    const handler = new RetryHandler(retryPolicy({ maxAttempts: 3 }));
    let attempts = 0;
    const call = () => {
      attempts++;
      return Promise.reject(mockResponseError(400));
    };

    await expect(handler.execute(call, "no retry 4xx")).rejects.toBeInstanceOf(NoviCloudError);
    expect(attempts).toBe(1);
  });

  it("retries on 429 with Retry-After", async () => {
    const handler = new RetryHandler(
      retryPolicy({ maxAttempts: 2, retryOn429: true, backoffStrategy: "fixed" }),
    );
    let attempts = 0;
    const call = () => {
      attempts++;
      if (attempts === 1) {
        return Promise.reject(mockResponseError(429, { "Retry-After": "1" }));
      }
      return Promise.resolve("recovered");
    };

    const result = await handler.execute(call, "429 retry");
    expect(result).toBe("recovered");
    expect(attempts).toBe(2);
  });

  it("does not retry POST on 5xx when retryPost=false", async () => {
    const handler = new RetryHandler(retryPolicy({ maxAttempts: 3, retryPost: false }));
    let attempts = 0;
    const call = () => {
      attempts++;
      return Promise.reject(mockResponseError(500));
    };

    await expect(handler.executePost(call, "no post retry")).rejects.toBeInstanceOf(
      NoviCloudServerError,
    );
    expect(attempts).toBe(1);
  });

  it("run wraps void calls", async () => {
    const handler = new RetryHandler(retryPolicy({ enabled: false }));
    let called = false;
    await handler.run(async () => {
      called = true;
    }, "void test");
    expect(called).toBe(true);
  });

  it("exhausts all attempts then throws", async () => {
    const handler = new RetryHandler(retryPolicy({ maxAttempts: 2, backoffStrategy: "fixed" }));
    let attempts = 0;
    const call = () => {
      attempts++;
      return Promise.reject(mockResponseError(500));
    };

    await expect(handler.execute(call, "exhaust")).rejects.toBeInstanceOf(NoviCloudServerError);
    expect(attempts).toBe(2);
  });
});
