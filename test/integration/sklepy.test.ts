import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { NoviCloudClient } from "../../src/client.js";
import listJson from "../fixtures/sklepy-list.json";
import singleJson from "../fixtures/sklepy-single.json";
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

describe("SklepyClient integration (soft-delete CRUD)", () => {
  it("list returns items", async () => {
    server.use(http.get(`${BASE}/${ACC}/sklepy`, () => HttpResponse.json(listJson)));
    const items: unknown[] = [];
    for await (const item of client().sklepy().list()) items.push(item);
    expect(items).toHaveLength(1);
    const first = items[0] as Record<string, unknown>;
    expect(first.id).toBe(1);
    expect(first.nazwa).toBe("Sklep Glowny");
    expect(first.nip).toBe("9876543210");
    expect(first.skrot).toBe("SG");
    expect(first.numer).toBe(1);
    expect(first.ulica).toBe("Krakowska");
    expect(first.nrDomu).toBe("5");
    expect(first.nrLokalu).toBeUndefined();
    expect(first.ulicaINumer).toBe("Krakowska 5");
    expect(first.kodPoczt).toBe("30-001");
    expect(first.poczta).toBe("Krakow");
    expect(first.miasto).toBe("Krakow");
    expect(first.gmina).toBe("Krakow");
    expect(first.powiat).toBe("Krakow");
    expect(first.wojewodztwo).toBe("malopolskie");
    expect((first.kraj as Record<string, unknown>).id).toBe("1");
    expect(first.telefon).toBe("121234567");
    expect(first.email).toBe("sklep@test.pl");
    expect(first.bank).toBe("PKO BP");
    expect(first.konto).toBe("PL61109010140000071219812874");
    expect(first.aktywny).toBe(true);
  });

  it("count returns total", async () => {
    server.use(http.get(`${BASE}/${ACC}/sklepy`, () => HttpResponse.json(listJson)));
    expect(await client().sklepy().count()).toBe(1);
  });

  it("getById returns single", async () => {
    server.use(http.get(`${BASE}/${ACC}/sklepy/1`, () => HttpResponse.json(singleJson)));
    const item = await client().sklepy().getById(1);
    expect(item.nazwa).toBe("Sklep Glowny");
    expect(item.aktywny).toBe(true);
  });

  it("create returns id", async () => {
    server.use(
      http.post(`${BASE}/${ACC}/sklepy`, () => HttpResponse.json(created, { status: 201 })),
    );
    expect(await client().sklepy().create({ nazwa: "Nowy Sklep" })).toBe("9999");
  });

  it("update sends PUT", async () => {
    let called = false;
    server.use(
      http.put(`${BASE}/${ACC}/sklepy`, () => {
        called = true;
        return HttpResponse.json(ok);
      }),
    );
    await client().sklepy().update({ id: 1, nazwa: "Sklep Centralny" });
    expect(called).toBe(true);
  });

  it("deleteById sends DELETE (soft)", async () => {
    let called = false;
    server.use(
      http.delete(`${BASE}/${ACC}/sklepy/1`, () => {
        called = true;
        return HttpResponse.json(ok);
      }),
    );
    await client().sklepy().deleteById(1);
    expect(called).toBe(true);
  });
});
