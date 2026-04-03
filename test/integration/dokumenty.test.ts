import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { NoviCloudClient } from "../../src/client.js";
import listJson from "../fixtures/dokumenty-list.json";
import singleJson from "../fixtures/dokumenty-single.json";

const BASE = "http://localhost:9999/rest/api";
const ACC = "demo";
const server = setupServer();
const client = () =>
  NoviCloudClient.create(ACC, "pw", { baseUrl: BASE, retryPolicy: { enabled: false } });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("DokumentyClient integration (read-only)", () => {
  it("list returns items", async () => {
    server.use(http.get(`${BASE}/${ACC}/dokumenty`, () => HttpResponse.json(listJson)));
    const items: unknown[] = [];
    for await (const i of client().dokumenty().list()) items.push(i);
    expect(items).toHaveLength(1);
    const first = items[0] as Record<string, unknown>;
    expect(first.id).toBe(100);
    expect(first.typDok).toBe(1);
    expect(first.dataWystawienia).toBeInstanceOf(Date);
    expect(first.dataWplywu).toBeInstanceOf(Date);
    expect(first.dataWykonania).toBeInstanceOf(Date);
    expect(first.nrDok).toBe("PA/1/2026");
    expect(first.kartaRabatowa).toBeUndefined();
    expect(first.nipNaPar).toBeUndefined();
    expect(first.nrSystemowy).toBe("SYS-001");
    expect(first.nrFiskalny).toBe("F-001");
    expect(first.nrRapDobowego).toBe("RD-001");
    expect(first.komentarz).toBe("Test paragon");
    expect((first.sklep as Record<string, unknown>).id).toBe("1");
    expect(first.sklepOdb).toBeUndefined();
    expect(first.kontrahent).toBeUndefined();
    expect(first.platnik).toBeUndefined();
    expect((first.kasa as Record<string, unknown>).id).toBe("5");
    expect((first.kasjer as Record<string, unknown>).id).toBe("3");
    expect(first.storno).toBe(false);
    expect(first.netto).toBeCloseTo(81.3);
    expect(first.podatek).toBeCloseTo(18.7);
    expect(first.brutto).toBeCloseTo(100.0);
    expect(first.rabat).toBeCloseTo(0.0);
    expect((first.formaPlatn as Record<string, unknown>).id).toBe("1");
    expect(first.terminPlatn).toBeUndefined();
    expect(first.zaplacono).toBeCloseTo(100.0);
    expect(first.dotyczy).toBeUndefined();
    expect((first.pozycje as Record<string, unknown>).id).toBe("100");
  });

  it("count returns total", async () => {
    server.use(http.get(`${BASE}/${ACC}/dokumenty`, () => HttpResponse.json(listJson)));
    expect(await client().dokumenty().count()).toBe(1);
  });

  it("getById returns single", async () => {
    server.use(http.get(`${BASE}/${ACC}/dokumenty/100`, () => HttpResponse.json(singleJson)));
    const item = await client().dokumenty().getById(100);
    expect(item.id).toBe(100);
    expect(item.nrDok).toBe("PA/1/2026");
  });

  it("getById throws on null", async () => {
    await expect(
      client()
        .dokumenty()
        .getById(null as never),
    ).rejects.toThrow("id must not be null");
  });
});
