import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { NoviCloudClient } from "../../src/client.js";
import listJson from "../fixtures/jmiary-list.json";
import singleJson from "../fixtures/jmiary-single.json";
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

describe("JmiaryClient integration (hard-delete CRUD)", () => {
  it("list returns items", async () => {
    server.use(http.get(`${BASE}/${ACC}/jmiary`, () => HttpResponse.json(listJson)));
    const items: unknown[] = [];
    for await (const item of client().jmiary().list()) items.push(item);
    expect(items).toHaveLength(2);
    const first = items[0] as Record<string, unknown>;
    expect(first.id).toBe(1);
    expect(first.nazwa).toBe("szt");
    expect(first.precyzja).toBe(0);
  });

  it("count returns total", async () => {
    server.use(http.get(`${BASE}/${ACC}/jmiary`, () => HttpResponse.json(listJson)));
    expect(await client().jmiary().count()).toBe(2);
  });

  it("getById returns single", async () => {
    server.use(http.get(`${BASE}/${ACC}/jmiary/1`, () => HttpResponse.json(singleJson)));
    const item = await client().jmiary().getById(1);
    expect(item.nazwa).toBe("szt");
    expect(item.precyzja).toBe(0);
  });

  it("getById throws on null", async () => {
    await expect(
      client()
        .jmiary()
        .getById(null as never),
    ).rejects.toThrow("id must not be null");
  });

  it("create returns id", async () => {
    server.use(
      http.post(`${BASE}/${ACC}/jmiary`, () => HttpResponse.json(created, { status: 201 })),
    );
    expect(await client().jmiary().create({ nazwa: "l" })).toBe("9999");
  });

  it("update sends PUT", async () => {
    let called = false;
    server.use(
      http.put(`${BASE}/${ACC}/jmiary`, () => {
        called = true;
        return HttpResponse.json(ok);
      }),
    );
    await client().jmiary().update({ id: 1, nazwa: "litry" });
    expect(called).toBe(true);
  });

  it("deleteById sends DELETE", async () => {
    let called = false;
    server.use(
      http.delete(`${BASE}/${ACC}/jmiary/1`, () => {
        called = true;
        return HttpResponse.json(ok);
      }),
    );
    await client().jmiary().deleteById(1);
    expect(called).toBe(true);
  });
});
