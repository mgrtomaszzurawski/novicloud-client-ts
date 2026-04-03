import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { NoviCloudClient } from "../../src/client.js";
import listJson from "../fixtures/rapsprzed-list.json";

const BASE = "http://localhost:9999/rest/api";
const ACC = "demo";
const server = setupServer();
const client = () =>
  NoviCloudClient.create(ACC, "pw", { baseUrl: BASE, retryPolicy: { enabled: false } });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("RapSprzedClient integration (report-only)", () => {
  it("list returns report items", async () => {
    server.use(http.get(`${BASE}/${ACC}/rapsprzed`, () => HttpResponse.json(listJson)));
    const items: unknown[] = [];
    for await (const item of client().rapSprzed().list()) items.push(item);
    expect(items).toHaveLength(1);
    const first = items[0] as Record<string, unknown>;
    expect((first.towar as Record<string, unknown>).id).toBe("2");
    expect((first.asort as Record<string, unknown>).id).toBe("1");
    expect((first.sklep as Record<string, unknown>).id).toBe("1");
    expect(first.kasa).toBeUndefined();
    expect(first.kasjer).toBeUndefined();
    expect(first.kontrahent).toBeUndefined();
    expect(first.kartaRabatowa).toBeUndefined();
    expect(first.formaPlatn).toBeUndefined();
    expect(first.ilosc).toBeCloseTo(150.0);
    expect(first.sprzNetto).toBeCloseTo(4500.0);
    expect(first.sprzBrutto).toBeCloseTo(5535.0);
    expect(first.sprzZakNetto).toBeCloseTo(3200.0);
    expect(first.sprzZakBrutto).toBeCloseTo(3936.0);
    expect(first.marzaNetto).toBeCloseTo(1300.0);
    expect(first.marzaBrutto).toBeCloseTo(1599.0);
    expect(first.marzaProcNetto).toBeCloseTo(28.89);
    expect(first.marzaProcBrutto).toBeCloseTo(28.89);
    expect(first.narzutProcNetto).toBeCloseTo(40.63);
    expect(first.narzutProcBrutto).toBeCloseTo(40.63);
    expect(first.rabat).toBeCloseTo(50.0);
    expect(first.rabatProc).toBeCloseTo(0.89);
  });

  it("count returns total", async () => {
    server.use(http.get(`${BASE}/${ACC}/rapsprzed`, () => HttpResponse.json(listJson)));
    expect(await client().rapSprzed().count()).toBe(1);
  });
});
