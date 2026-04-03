import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { NoviCloudClient } from "../../src/client.js";
import asortyList from "../fixtures/asorty-list.json";
import asortySingle from "../fixtures/asorty-single.json";
import created from "../fixtures/created.json";
import ok from "../fixtures/ok.json";

const BASE_URL = "http://localhost:9999/rest/api";
const ACCOUNT = "demo";

const server = setupServer();

function createClient() {
  return NoviCloudClient.create(ACCOUNT, "password", {
    baseUrl: BASE_URL,
    retryPolicy: { enabled: false },
  });
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AsortyClient integration (hard-delete CRUD)", () => {
  it("list returns deserialized items", async () => {
    server.use(http.get(`${BASE_URL}/${ACCOUNT}/asorty`, () => HttpResponse.json(asortyList)));

    const client = createClient();
    const items: unknown[] = [];
    for await (const item of client.asorty().list()) {
      items.push(item);
    }

    expect(items).toHaveLength(2);
    const first = items[0] as Record<string, unknown>;
    expect(first.id).toBe(1);
    expect(first.nazwa).toBe("Owoce");
    expect(first.parent).toBeUndefined();
  });

  it("list with query passes filter params", async () => {
    let capturedUrl = "";
    server.use(
      http.get(`${BASE_URL}/${ACCOUNT}/asorty`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(asortyList);
      }),
    );

    const client = createClient();
    for await (const _item of client.asorty().list({ nazwa: "Owoce" })) {
      // consume
    }

    expect(capturedUrl).toContain("nazwa=Owoce");
  });

  it("count returns total from size field", async () => {
    server.use(http.get(`${BASE_URL}/${ACCOUNT}/asorty`, () => HttpResponse.json(asortyList)));

    const client = createClient();
    expect(await client.asorty().count()).toBe(2);
  });

  it("getById returns single asorty", async () => {
    server.use(http.get(`${BASE_URL}/${ACCOUNT}/asorty/1`, () => HttpResponse.json(asortySingle)));

    const client = createClient();
    const item = await client.asorty().getById(1);
    expect(item.id).toBe(1);
    expect(item.nazwa).toBe("Owoce");
  });

  it("getById throws on null id", async () => {
    const client = createClient();
    await expect(client.asorty().getById(null as unknown as number)).rejects.toThrow(
      "id must not be null",
    );
  });

  it("create returns created id", async () => {
    server.use(
      http.post(`${BASE_URL}/${ACCOUNT}/asorty`, () => HttpResponse.json(created, { status: 201 })),
    );

    const client = createClient();
    const id = await client.asorty().create({ nazwa: "Nabialy" });
    expect(id).toBe("9999");
  });

  it("update sends PUT request", async () => {
    let called = false;
    server.use(
      http.put(`${BASE_URL}/${ACCOUNT}/asorty`, () => {
        called = true;
        return HttpResponse.json(ok);
      }),
    );

    const client = createClient();
    await client.asorty().update({ id: 1, nazwa: "Owoce Tropikalne" });
    expect(called).toBe(true);
  });

  it("deleteById sends DELETE (hard-delete)", async () => {
    let called = false;
    server.use(
      http.delete(`${BASE_URL}/${ACCOUNT}/asorty/1`, () => {
        called = true;
        return HttpResponse.json(ok);
      }),
    );

    const client = createClient();
    await client.asorty().deleteById(1);
    expect(called).toBe(true);
  });

  it("deleteById throws on null id", async () => {
    const client = createClient();
    await expect(client.asorty().deleteById(null as unknown as number)).rejects.toThrow(
      "id must not be null",
    );
  });
});
