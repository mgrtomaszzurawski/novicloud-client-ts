import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { NoviCloudClient } from "../../src/client.js";
import listJson from "../fixtures/kontrahenci-list.json";
import singleJson from "../fixtures/kontrahenci-single.json";
import created from "../fixtures/created.json";
import ok from "../fixtures/ok.json";

const BASE = "http://localhost:9999/rest/api";
const ACC = "demo";
const server = setupServer();
const client = () =>
  NoviCloudClient.create(ACC, "pw", { baseUrl: BASE, retryPolicy: { enabled: false } });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("KontrahenciClient integration (soft-delete CRUD)", () => {
  it("list returns items", async () => {
    server.use(http.get(`${BASE}/${ACC}/kontrahenci`, () => HttpResponse.json(listJson)));
    const items: unknown[] = [];
    for await (const item of client().kontrahenci().list()) items.push(item);
    expect(items).toHaveLength(1);
    const first = items[0] as Record<string, unknown>;
    expect(first.id).toBe(10);
    expect(first.nazwa).toBe("Firma ABC");
    expect(first.nip).toBe("1234567890");
    expect(first.skrot).toBe("ABC");
    expect(first.ulica).toBe("Marszalkowska");
    expect(first.nrDomu).toBe("10");
    expect(first.nrLokalu).toBe("5A");
    expect(first.ulicaINumer).toBe("Marszalkowska 10/5A");
    expect(first.kodPoczt).toBe("00-001");
    expect(first.poczta).toBe("Warszawa");
    expect(first.miasto).toBe("Warszawa");
    expect(first.gmina).toBe("Warszawa");
    expect(first.powiat).toBe("Warszawa");
    expect(first.wojewodztwo).toBe("mazowieckie");
    expect((first.kraj as Record<string, unknown>).id).toBe("1");
    expect(first.telefon).toBe("221234567");
    expect(first.email).toBe("biuro@firma-abc.pl");
    expect(first.aktywny).toBe(true);
    expect(first.dostawca).toBe(true);
    expect(first.staly).toBe(false);
    expect(first.producent).toBe(false);
    expect(first.odbiorca).toBe(true);
    expect(first.osoba).toBe(false);
  });

  it("count returns total", async () => {
    server.use(http.get(`${BASE}/${ACC}/kontrahenci`, () => HttpResponse.json(listJson)));
    expect(await client().kontrahenci().count()).toBe(1);
  });

  it("getById returns single", async () => {
    server.use(http.get(`${BASE}/${ACC}/kontrahenci/10`, () => HttpResponse.json(singleJson)));
    const item = await client().kontrahenci().getById(10);
    expect(item.nazwa).toBe("Firma ABC");
  });

  it("create returns id", async () => {
    server.use(
      http.post(`${BASE}/${ACC}/kontrahenci`, () => HttpResponse.json(created, { status: 201 })),
    );
    expect(await client().kontrahenci().create({ nazwa: "Nowy" })).toBe("9999");
  });

  it("update sends PUT", async () => {
    let called = false;
    server.use(
      http.put(`${BASE}/${ACC}/kontrahenci`, () => {
        called = true;
        return HttpResponse.json(ok);
      }),
    );
    await client().kontrahenci().update({ id: 10, nazwa: "Firma XYZ" });
    expect(called).toBe(true);
  });

  it("deleteById sends DELETE (soft)", async () => {
    let called = false;
    server.use(
      http.delete(`${BASE}/${ACC}/kontrahenci/10`, () => {
        called = true;
        return HttpResponse.json(ok);
      }),
    );
    await client().kontrahenci().deleteById(10);
    expect(called).toBe(true);
  });
});
