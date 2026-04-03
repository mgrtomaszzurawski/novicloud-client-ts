import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { NoviCloudClient } from "../../src/client.js";
import listJson from "../fixtures/rapsprzed-list.json";

const BASE = "http://localhost:9999/rest/api";
const ACC = "demo";
const server = setupServer();
const client = () =>
  NoviCloudClient.create(ACC, "pw", { baseUrl: BASE, retryPolicy: { enabled: false } });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("RapSprzedClient integration (report-only)", () => {
  it("list returns report items", async () => {
    server.use(http.get(`${BASE}/${ACC}/rapsprzed`, () => HttpResponse.json(listJson)));
    const items: unknown[] = [];
    for await (const i of client().rapSprzed().list()) items.push(i);
    expect(items).toHaveLength(1);
    const first = items[0] as Record<string, unknown>;
    expect(first.ilosc).toBe(150.0);
    expect(first.sprzBrutto).toBe(5535.0);
  });

  it("count returns total", async () => {
    server.use(http.get(`${BASE}/${ACC}/rapsprzed`, () => HttpResponse.json(listJson)));
    expect(await client().rapSprzed().count()).toBe(1);
  });
});
