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
    for await (const i of client().kontrahenci().list()) items.push(i);
    expect(items).toHaveLength(1);
    const first = items[0] as Record<string, unknown>;
    expect(first.nazwa).toBe("Firma ABC");
    expect(first.nip).toBe("1234567890");
    expect(first.aktywny).toBe(true);
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
