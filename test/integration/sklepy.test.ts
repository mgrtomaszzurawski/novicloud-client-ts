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
    for await (const i of client().sklepy().list()) items.push(i);
    expect(items).toHaveLength(1);
    expect((items[0] as Record<string, unknown>).nazwa).toBe("Sklep Glowny");
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
