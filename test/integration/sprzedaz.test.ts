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
    for await (const item of client().sprzedaz().list()) items.push(item);
    expect(items).toHaveLength(1);
    const first = items[0] as Record<string, unknown>;
    expect(first.id).toBe(200);
    expect(first.data).toBeInstanceOf(Date);
    expect(first.nrDok).toBe("PA/1/2026");
    expect(first.typDok).toBe(1);
    expect(first.nrSystemowy).toBe("SYS-001");
    expect(first.nrFiskalny).toBe("F-001");
    expect(first.nrRapDob).toBe("RD-001");
    expect(first.ilosc).toBeCloseTo(3.0);
    expect(first.cena).toBeCloseTo(16.9);
    expect(first.cenaPrzedRab).toBeCloseTo(16.9);
    expect(first.stawkaVat).toBe(2300);
    expect(first.brutto).toBeCloseTo(50.7);
    expect(first.podatek).toBeCloseTo(9.53);
    expect(first.rabat).toBeCloseTo(0.0);
    expect((first.towar as Record<string, unknown>).id).toBe("2");
    expect((first.sklep as Record<string, unknown>).id).toBe("1");
    expect((first.kasa as Record<string, unknown>).id).toBe("5");
    expect((first.kasjer as Record<string, unknown>).id).toBe("3");
    expect(first.kontrahent).toBeUndefined();
  });

  it("count returns total", async () => {
    server.use(http.get(`${BASE}/${ACC}/sprzedaz`, () => HttpResponse.json(listJson)));
    expect(await client().sprzedaz().count()).toBe(1);
  });

  it("getById returns single", async () => {
    server.use(http.get(`${BASE}/${ACC}/sprzedaz/200`, () => HttpResponse.json(singleJson)));
    const item = await client().sprzedaz().getById(200);
    expect(item.id).toBe(200);
    expect(item.typDok).toBe(1);
  });

  it("getById throws on null", async () => {
    await expect(
      client()
        .sprzedaz()
        .getById(null as never),
    ).rejects.toThrow("id must not be null");
  });
});
