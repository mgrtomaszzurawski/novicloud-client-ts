import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { NoviCloudClient } from "../../src/client.js";
import listJson from "../fixtures/stawkivat-list.json";
import singleJson from "../fixtures/stawkivat-single.json";
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

describe("StawkiVatClient integration (no update - ADR-022)", () => {
  it("list returns items", async () => {
    server.use(http.get(`${BASE}/${ACC}/stawkivat`, () => HttpResponse.json(listJson)));
    const items: unknown[] = [];
    for await (const i of client().stawkiVat().list()) items.push(i);
    expect(items).toHaveLength(2);
    const first = items[0] as Record<string, unknown>;
    expect(first.id).toBe(2300);
    expect(first.opis).toBe("23%");
    expect(first.etykieta).toBe("A");
  });

  it("count returns total", async () => {
    server.use(http.get(`${BASE}/${ACC}/stawkivat`, () => HttpResponse.json(listJson)));
    expect(await client().stawkiVat().count()).toBe(2);
  });

  it("getById returns single", async () => {
    server.use(http.get(`${BASE}/${ACC}/stawkivat/2300`, () => HttpResponse.json(singleJson)));
    const item = await client().stawkiVat().getById(2300);
    expect(item.opis).toBe("23%");
    expect(item.etykieta).toBe("A");
  });

  it("create returns id", async () => {
    server.use(
      http.post(`${BASE}/${ACC}/stawkivat`, () => HttpResponse.json(created, { status: 201 })),
    );
    expect(await client().stawkiVat().create({ id: 500, opis: "5%" })).toBe("9999");
  });

  it("deleteById sends DELETE", async () => {
    let called = false;
    server.use(
      http.delete(`${BASE}/${ACC}/stawkivat/2300`, () => {
        called = true;
        return HttpResponse.json(ok);
      }),
    );
    await client().stawkiVat().deleteById(2300);
    expect(called).toBe(true);
  });
});
