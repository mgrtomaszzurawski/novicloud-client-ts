import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { NoviCloudClient } from "../../src/client.js";
import listJson from "../fixtures/kasjerzy-list.json";
import singleJson from "../fixtures/kasjerzy-single.json";

const BASE = "http://localhost:9999/rest/api";
const ACC = "demo";
const server = setupServer();
const client = () =>
  NoviCloudClient.create(ACC, "pw", { baseUrl: BASE, retryPolicy: { enabled: false } });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("KasjerzyClient integration (read-only)", () => {
  it("list returns items", async () => {
    server.use(http.get(`${BASE}/${ACC}/kasjerzy`, () => HttpResponse.json(listJson)));
    const items: unknown[] = [];
    for await (const i of client().kasjerzy().list()) items.push(i);
    expect(items).toHaveLength(1);
    const first = items[0] as Record<string, unknown>;
    expect(first.id).toBe(3);
    expect(first.nazwisko).toBe("Kowalski");
    expect(first.kodKasjera).toBe("KAS01");
    expect(first.aktywny).toBe(true);
  });

  it("count returns total", async () => {
    server.use(http.get(`${BASE}/${ACC}/kasjerzy`, () => HttpResponse.json(listJson)));
    expect(await client().kasjerzy().count()).toBe(1);
  });

  it("getById returns single", async () => {
    server.use(http.get(`${BASE}/${ACC}/kasjerzy/3`, () => HttpResponse.json(singleJson)));
    const item = await client().kasjerzy().getById(3);
    expect(item.nazwisko).toBe("Kowalski");
    expect(item.aktywny).toBe(true);
  });

  it("getById throws on null", async () => {
    await expect(
      client()
        .kasjerzy()
        .getById(null as never),
    ).rejects.toThrow("id must not be null");
  });
});
