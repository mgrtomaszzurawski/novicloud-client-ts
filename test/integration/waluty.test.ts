import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { NoviCloudClient } from "../../src/client.js";
import listJson from "../fixtures/waluty-list.json";
import singleJson from "../fixtures/waluty-single.json";
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

describe("WalutyClient integration (soft-delete CRUD)", () => {
  it("list returns items", async () => {
    server.use(http.get(`${BASE}/${ACC}/waluty`, () => HttpResponse.json(listJson)));
    const items: unknown[] = [];
    for await (const i of client().waluty().list()) items.push(i);
    expect(items).toHaveLength(2);
    const first = items[0] as Record<string, unknown>;
    expect(first.nazwa).toBe("zloty");
    expect(first.kod).toBe("PLN");
    expect(first.aktywny).toBe(true);
  });

  it("count returns total", async () => {
    server.use(http.get(`${BASE}/${ACC}/waluty`, () => HttpResponse.json(listJson)));
    expect(await client().waluty().count()).toBe(2);
  });

  it("getById returns single", async () => {
    server.use(http.get(`${BASE}/${ACC}/waluty/1`, () => HttpResponse.json(singleJson)));
    const item = await client().waluty().getById(1);
    expect(item.nazwa).toBe("zloty");
    expect(item.kurs).toBe(1.0);
  });

  it("create returns id", async () => {
    server.use(
      http.post(`${BASE}/${ACC}/waluty`, () => HttpResponse.json(created, { status: 201 })),
    );
    expect(await client().waluty().create({ nazwa: "dolar", kod: "USD" })).toBe("9999");
  });

  it("update sends PUT", async () => {
    let called = false;
    server.use(
      http.put(`${BASE}/${ACC}/waluty`, () => {
        called = true;
        return HttpResponse.json(ok);
      }),
    );
    await client().waluty().update({ id: 2, kurs: 4.4 });
    expect(called).toBe(true);
  });

  it("deleteById sends DELETE (soft)", async () => {
    let called = false;
    server.use(
      http.delete(`${BASE}/${ACC}/waluty/2`, () => {
        called = true;
        return HttpResponse.json(ok);
      }),
    );
    await client().waluty().deleteById(2);
    expect(called).toBe(true);
  });
});
