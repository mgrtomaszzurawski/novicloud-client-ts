import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { NoviCloudClient } from "../../src/client.js";
import listJson from "../fixtures/kraje-list.json";
import singleJson from "../fixtures/kraje-single.json";
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

describe("KrajeClient integration (hard-delete CRUD)", () => {
  it("list returns items", async () => {
    server.use(http.get(`${BASE}/${ACC}/kraje`, () => HttpResponse.json(listJson)));
    const items: unknown[] = [];
    for await (const item of client().kraje().list()) items.push(item);
    expect(items).toHaveLength(2);
    const first = items[0] as Record<string, unknown>;
    expect(first.id).toBe(1);
    expect(first.nazwa).toBe("Polska");
    expect(first.kod).toBe("PL");
    expect((first.waluta as Record<string, unknown>).id).toBe("1");
  });

  it("count returns total", async () => {
    server.use(http.get(`${BASE}/${ACC}/kraje`, () => HttpResponse.json(listJson)));
    expect(await client().kraje().count()).toBe(2);
  });

  it("getById returns single", async () => {
    server.use(http.get(`${BASE}/${ACC}/kraje/1`, () => HttpResponse.json(singleJson)));
    const item = await client().kraje().getById(1);
    expect(item.nazwa).toBe("Polska");
  });

  it("create returns id", async () => {
    server.use(
      http.post(`${BASE}/${ACC}/kraje`, () => HttpResponse.json(created, { status: 201 })),
    );
    expect(await client().kraje().create({ nazwa: "Francja", kod: "FR" })).toBe("9999");
  });

  it("update sends PUT", async () => {
    let called = false;
    server.use(
      http.put(`${BASE}/${ACC}/kraje`, () => {
        called = true;
        return HttpResponse.json(ok);
      }),
    );
    await client().kraje().update({ id: 1, nazwa: "Rzeczpospolita" });
    expect(called).toBe(true);
  });

  it("deleteById sends DELETE (hard)", async () => {
    let called = false;
    server.use(
      http.delete(`${BASE}/${ACC}/kraje/2`, () => {
        called = true;
        return HttpResponse.json(ok);
      }),
    );
    await client().kraje().deleteById(2);
    expect(called).toBe(true);
  });
});
