import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { NoviCloudClient } from "../../src/client.js";
import kasyList from "../fixtures/kasy-list.json";
import kasySingle from "../fixtures/kasy-single.json";

const BASE_URL = "http://localhost:9999/rest/api";
const ACCOUNT = "demo";

const server = setupServer();

function createClient() {
  return NoviCloudClient.create(ACCOUNT, "password", {
    baseUrl: BASE_URL,
    retryPolicy: { enabled: false },
  });
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("KasyClient integration (read-only)", () => {
  it("list returns deserialized items", async () => {
    server.use(http.get(`${BASE_URL}/${ACCOUNT}/kasy`, () => HttpResponse.json(kasyList)));

    const client = createClient();
    const items: unknown[] = [];
    for await (const item of client.kasy().list()) {
      items.push(item);
    }

    expect(items).toHaveLength(1);
    const first = items[0] as Record<string, unknown>;
    expect(first.id).toBe(5);
    expect(first.nazwa).toBe("Kasa Glowna");
    expect(first.numer).toBe(1);
    expect(first.aktywny).toBe(true);
  });

  it("list with filter passes query params", async () => {
    let capturedUrl = "";
    server.use(
      http.get(`${BASE_URL}/${ACCOUNT}/kasy`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(kasyList);
      }),
    );

    const client = createClient();
    for await (const _item of client.kasy().list({ aktywny: true })) {
      // consume
    }

    expect(capturedUrl).toContain("aktywny=true");
  });

  it("count returns total", async () => {
    server.use(http.get(`${BASE_URL}/${ACCOUNT}/kasy`, () => HttpResponse.json(kasyList)));

    const client = createClient();
    expect(await client.kasy().count()).toBe(1);
  });

  it("getById returns single kasa", async () => {
    server.use(http.get(`${BASE_URL}/${ACCOUNT}/kasy/5`, () => HttpResponse.json(kasySingle)));

    const client = createClient();
    const kasa = await client.kasy().getById(5);
    expect(kasa.id).toBe(5);
    expect(kasa.nazwa).toBe("Kasa Glowna");
  });

  it("getById throws on null id", async () => {
    const client = createClient();
    await expect(client.kasy().getById(null as unknown as number)).rejects.toThrow(
      "id must not be null",
    );
  });
});
