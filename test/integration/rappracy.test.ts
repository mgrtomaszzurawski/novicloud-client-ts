import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { NoviCloudClient } from "../../src/client.js";
import listJson from "../fixtures/rappracy-list.json";

const BASE = "http://localhost:9999/rest/api";
const ACC = "demo";
const server = setupServer();
const client = () =>
  NoviCloudClient.create(ACC, "pw", { baseUrl: BASE, retryPolicy: { enabled: false } });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("RapPracyClient integration (report-only)", () => {
  it("list returns report items", async () => {
    server.use(http.get(`${BASE}/${ACC}/rappracy`, () => HttpResponse.json(listJson)));
    const items: unknown[] = [];
    for await (const i of client().rapPracy().list()) items.push(i);
    expect(items).toHaveLength(1);
    const first = items[0] as Record<string, unknown>;
    expect(first.utarg).toBe(3200.0);
    expect(first.gotowka).toBe(1500.0);
  });

  it("count returns total", async () => {
    server.use(http.get(`${BASE}/${ACC}/rappracy`, () => HttpResponse.json(listJson)));
    expect(await client().rapPracy().count()).toBe(1);
  });
});
