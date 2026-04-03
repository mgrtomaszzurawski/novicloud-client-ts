import { describe, it, expect } from "vitest";
import {
  NoviCloudError,
  NoviCloudAuthError,
  NoviCloudNotFoundError,
  NoviCloudRateLimitError,
  NoviCloudServerError,
  NoviCloudNetworkError,
} from "../src/errors.js";

function mockResponse(status: number, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: "test" }), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("NoviCloudError.of", () => {
  it("maps 401 to NoviCloudAuthError", async () => {
    const err = await NoviCloudError.of("auth fail", mockResponse(401));
    expect(err).toBeInstanceOf(NoviCloudAuthError);
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("auth fail");
  });

  it("maps 403 to NoviCloudAuthError", async () => {
    const err = await NoviCloudError.of("forbidden", mockResponse(403));
    expect(err).toBeInstanceOf(NoviCloudAuthError);
    expect(err.statusCode).toBe(403);
  });

  it("maps 404 to NoviCloudNotFoundError", async () => {
    const err = await NoviCloudError.of("not found", mockResponse(404));
    expect(err).toBeInstanceOf(NoviCloudNotFoundError);
    expect(err.statusCode).toBe(404);
  });

  it("maps 410 to NoviCloudNotFoundError", async () => {
    const err = await NoviCloudError.of("gone", mockResponse(410));
    expect(err).toBeInstanceOf(NoviCloudNotFoundError);
    expect(err.statusCode).toBe(410);
  });

  it("maps 429 to NoviCloudRateLimitError with Retry-After", async () => {
    const err = await NoviCloudError.of("rate limited", mockResponse(429, { "Retry-After": "30" }));
    expect(err).toBeInstanceOf(NoviCloudRateLimitError);
    expect(err.statusCode).toBe(429);
    expect((err as NoviCloudRateLimitError).retryAfterSeconds).toBe(30);
  });

  it("maps 429 without Retry-After to retryAfterSeconds=0", async () => {
    const err = await NoviCloudError.of("rate limited", mockResponse(429));
    expect(err).toBeInstanceOf(NoviCloudRateLimitError);
    expect((err as NoviCloudRateLimitError).retryAfterSeconds).toBe(0);
  });

  it("maps 500 to NoviCloudServerError", async () => {
    const err = await NoviCloudError.of("server error", mockResponse(500));
    expect(err).toBeInstanceOf(NoviCloudServerError);
    expect(err.statusCode).toBe(500);
  });

  it("maps 503 to NoviCloudServerError", async () => {
    const err = await NoviCloudError.of("unavailable", mockResponse(503));
    expect(err).toBeInstanceOf(NoviCloudServerError);
  });

  it("maps 400 to base NoviCloudError", async () => {
    const err = await NoviCloudError.of("bad request", mockResponse(400));
    expect(err).toBeInstanceOf(NoviCloudError);
    expect(err).not.toBeInstanceOf(NoviCloudAuthError);
    expect(err).not.toBeInstanceOf(NoviCloudServerError);
    expect(err.statusCode).toBe(400);
  });

  it("reads response body", async () => {
    const err = await NoviCloudError.of("test", mockResponse(500));
    expect(err.responseBody).toContain("error");
  });
});

describe("NoviCloudError.network", () => {
  it("creates NoviCloudNetworkError with status 0", () => {
    const cause = new Error("ECONNREFUSED");
    const err = NoviCloudError.network("connection failed", cause);
    expect(err).toBeInstanceOf(NoviCloudNetworkError);
    expect(err.statusCode).toBe(0);
    expect(err.message).toBe("connection failed");
    expect(err.cause).toBe(cause);
  });
});

describe("Error hierarchy", () => {
  it("all errors extend NoviCloudError", () => {
    expect(new NoviCloudAuthError("", undefined, 401)).toBeInstanceOf(NoviCloudError);
    expect(new NoviCloudNotFoundError("", undefined, 404)).toBeInstanceOf(NoviCloudError);
    expect(new NoviCloudRateLimitError("", undefined, 429, undefined, 0)).toBeInstanceOf(
      NoviCloudError,
    );
    expect(new NoviCloudServerError("", undefined, 500)).toBeInstanceOf(NoviCloudError);
    expect(new NoviCloudNetworkError("", undefined, 0)).toBeInstanceOf(NoviCloudError);
  });

  it("all errors extend Error", () => {
    expect(new NoviCloudAuthError("", undefined, 401)).toBeInstanceOf(Error);
    expect(new NoviCloudServerError("", undefined, 500)).toBeInstanceOf(Error);
  });

  it("instanceof works correctly for catch blocks", () => {
    const err: Error = new NoviCloudRateLimitError("rl", undefined, 429, undefined, 10);
    if (err instanceof NoviCloudRateLimitError) {
      expect(err.retryAfterSeconds).toBe(10);
    } else {
      expect.unreachable("should be instanceof NoviCloudRateLimitError");
    }
  });
});
