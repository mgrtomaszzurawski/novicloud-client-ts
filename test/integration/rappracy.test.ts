import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { NoviCloudClient } from "../../src/client.js";
import listJson from "../fixtures/rappracy-list.json";

const BASE = "http://localhost:9999/rest/api";
const ACC = "demo";
const server = setupServer();
const client = () =>
  NoviCloudClient.create(ACC, "pw", { baseUrl: BASE, retryPolicy: { enabled: false } });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("RapPracyClient integration (report-only)", () => {
  it("list returns report items", async () => {
    server.use(http.get(`${BASE}/${ACC}/rappracy`, () => HttpResponse.json(listJson)));
    const items: unknown[] = [];
    for await (const item of client().rapPracy().list()) items.push(item);
    expect(items).toHaveLength(1);
    const first = items[0] as Record<string, unknown>;
    expect((first.sklep as Record<string, unknown>).id).toBe("1");
    expect((first.kasa as Record<string, unknown>).id).toBe("5");
    expect((first.kasjer as Record<string, unknown>).id).toBe("3");
    expect(first.czasPracy).toBe(480);
    expect(first.utarg).toBeCloseTo(3200.0);
    expect(first.gotowka).toBeCloseTo(1500.0);
    expect(first.karta).toBeCloseTo(1700.0);
    expect(first.czek).toBeCloseTo(0.0);
    expect(first.bon).toBeCloseTo(0.0);
    expect(first.przelew).toBeCloseTo(0.0);
    expect(first.inna).toBeCloseTo(0.0);
    expect(first.paragonyIlosc).toBe(45);
    expect(first.paragonyWartosc).toBeCloseTo(2800.0);
    expect(first.paragonyPozycje).toBe(120);
    expect(first.fakturyIlosc).toBe(3);
    expect(first.fakturyWartosc).toBeCloseTo(400.0);
    expect(first.fakturyPozycje).toBe(8);
    expect(first.stornoPozycje).toBe(1);
    expect(first.stornoWartosc).toBeCloseTo(16.9);
    expect(first.paragonyAnulowaneIlosc).toBe(0);
    expect(first.paragonyAnulowaneWartosc).toBeCloseTo(0.0);
  });

  it("count returns total", async () => {
    server.use(http.get(`${BASE}/${ACC}/rappracy`, () => HttpResponse.json(listJson)));
    expect(await client().rapPracy().count()).toBe(1);
  });
});
