import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { NoviCloudClient } from "../../src/client.js";
import listJson from "../fixtures/sprzedaz-list.json";
import singleJson from "../fixtures/sprzedaz-single.json";

const BASE = "http://localhost:9999/rest/api";
const ACC = "demo";
const server = setupServer();
const client = () =>
  NoviCloudClient.create(ACC, "pw", { baseUrl: BASE, retryPolicy: { enabled: false } });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("SprzedazClient integration (read-only)", () => {
  it("list returns items", async () => {
    server.use(http.get(`${BASE}/${ACC}/sprzedaz`, () => HttpResponse.json(listJson)));
    const items: unknown[] = [];
    for await (const i of client().sprzedaz().list()) items.push(i);
    expect(items).toHaveLength(1);
    const first = items[0] as Record<string, unknown>;
    expect(first.id).toBe(200);
    expect(first.brutto).toBe(50.7);
  });

  it("count returns total", async () => {
    server.use(http.get(`${BASE}/${ACC}/sprzedaz`, () => HttpResponse.json(listJson)));
    expect(await client().sprzedaz().count()).toBe(1);
  });

  it("getById returns single", async () => {
    server.use(http.get(`${BASE}/${ACC}/sprzedaz/200`, () => HttpResponse.json(singleJson)));
    const item = await client().sprzedaz().getById(200);
    expect(item.id).toBe(200);
    expect(item.typDok).toBe("PA");
  });

  it("getById throws on null", async () => {
    await expect(
      client()
        .sprzedaz()
        .getById(null as never),
    ).rejects.toThrow("id must not be null");
  });
});
