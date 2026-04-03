import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { NoviCloudClient } from "../../src/client.js";
import listJson from "../fixtures/pozdok-list.json";
import singleJson from "../fixtures/pozdok-single.json";

const BASE = "http://localhost:9999/rest/api";
const ACC = "demo";
const server = setupServer();
const client = () =>
  NoviCloudClient.create(ACC, "pw", { baseUrl: BASE, retryPolicy: { enabled: false } });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("PozdokClient integration (read-only)", () => {
  it("list returns items", async () => {
    server.use(http.get(`${BASE}/${ACC}/pozdok`, () => HttpResponse.json(listJson)));
    const items: unknown[] = [];
    for await (const item of client().pozdok().list()) items.push(item);
    expect(items).toHaveLength(1);
    const first = items[0] as Record<string, unknown>;
    expect(first.id).toBe(50);
    expect((first.dokument as Record<string, unknown>).id).toBe("100");
    expect((first.towar as Record<string, unknown>).id).toBe("2");
    expect(first.nrPozycji).toBe(1);
    expect(first.ilosc).toBeCloseTo(2.0);
    expect(first.iloscPocz).toBeCloseTo(2.0);
    expect(first.stawkaVat).toBe(2300);
    expect(first.cPrzedRabNetto).toBeCloseTo(13.74);
    expect(first.cPrzedRabBrutto).toBeCloseTo(16.9);
    expect(first.cPoRabNetto).toBeCloseTo(13.74);
    expect(first.cPoRabBrutto).toBeCloseTo(16.9);
    expect(first.rabatKwota).toBeCloseTo(0.0);
    expect(first.wNetto).toBeCloseTo(27.48);
    expect(first.wPodatek).toBeCloseTo(6.32);
    expect(first.wBrutto).toBeCloseTo(33.8);
    expect(first.orgIlosc).toBeCloseTo(2.0);
    expect(first.orgCPrzedRabNetto).toBeCloseTo(13.74);
    expect(first.orgCPrzedRabBrutto).toBeCloseTo(16.9);
    expect(first.orgCPoRabNetto).toBeCloseTo(13.74);
    expect(first.orgCPoRabBrutto).toBeCloseTo(16.9);
    expect(first.orgRabatKwota).toBeCloseTo(0.0);
    expect(first.orgWNetto).toBeCloseTo(27.48);
    expect(first.orgWPodatek).toBeCloseTo(6.32);
    expect(first.orgWBrutto).toBeCloseTo(33.8);
    expect(first.rozlNetto).toBeCloseTo(0.0);
    expect(first.rozlPodatek).toBeCloseTo(0.0);
    expect(first.rozlBrutto).toBeCloseTo(0.0);
    expect(first.storno).toBe(false);
  });

  it("count returns total", async () => {
    server.use(http.get(`${BASE}/${ACC}/pozdok`, () => HttpResponse.json(listJson)));
    expect(await client().pozdok().count()).toBe(1);
  });

  it("getById returns single", async () => {
    server.use(http.get(`${BASE}/${ACC}/pozdok/50`, () => HttpResponse.json(singleJson)));
    const item = await client().pozdok().getById(50);
    expect(item.id).toBe(50);
    expect(item.nrPozycji).toBe(1);
  });

  it("getById throws on null", async () => {
    await expect(
      client()
        .pozdok()
        .getById(null as never),
    ).rejects.toThrow("id must not be null");
  });
});
