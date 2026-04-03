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
    for await (const i of client().pozdok().list()) items.push(i);
    expect(items).toHaveLength(1);
    const first = items[0] as Record<string, unknown>;
    expect(first.id).toBe(50);
    expect(first.ilosc).toBe(2.0);
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
