import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { NoviCloudClient } from "../../src/client.js";
import {
  NoviCloudAuthError,
  NoviCloudNotFoundError,
  NoviCloudServerError,
} from "../../src/errors.js";
import towaryList from "../fixtures/towary-list.json";
import towarySingle from "../fixtures/towary-single.json";
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

describe("TowaryClient integration", () => {
  it("list returns all fields deserialized", async () => {
    server.use(http.get(`${BASE_URL}/${ACCOUNT}/towary`, () => HttpResponse.json(towaryList)));

    const client = createClient();
    const items: unknown[] = [];
    for await (const towar of client.towary().list()) {
      items.push(towar);
    }

    expect(items).toHaveLength(2);
    const first = items[0] as Record<string, unknown>;
    expect(first.id).toBe(2);
    expect(first.nazwa).toBe("Product Alpha");
    expect(first.kod).toBe("5901234567890");
    expect(first.stawkaVat).toBe(800);
    expect(first.akcyzowy).toBe(false);
    expect(first.aktywny).toBe(true);
    expect(first.cenaEw).toBeCloseTo(10.63);
    expect(first.cenaDet).toBeCloseTo(16.9);
    expect(first.gtu).toBe("GTU_01");
    expect(first.masaWl).toBeCloseTo(0.5);
  });

  it("list with query passes filter params", async () => {
    let capturedUrl = "";
    server.use(
      http.get(`${BASE_URL}/${ACCOUNT}/towary`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(towaryList);
      }),
    );

    const client = createClient();
    const items: unknown[] = [];
    for await (const towar of client.towary().list({ aktywny: true, kod: "ABC" })) {
      items.push(towar);
    }

    expect(capturedUrl).toContain("aktywny=true");
    expect(capturedUrl).toContain("kod=ABC");
  });

  it("count returns total from size field", async () => {
    server.use(http.get(`${BASE_URL}/${ACCOUNT}/towary`, () => HttpResponse.json(towaryList)));

    const client = createClient();
    const count = await client.towary().count();
    expect(count).toBe(2);
  });

  it("getById returns single towar", async () => {
    server.use(http.get(`${BASE_URL}/${ACCOUNT}/towary/2`, () => HttpResponse.json(towarySingle)));

    const client = createClient();
    const towar = await client.towary().getById(2);
    expect(towar.id).toBe(2);
    expect(towar.nazwa).toBe("Product Alpha");
  });

  it("getById throws on null id", async () => {
    const client = createClient();
    await expect(client.towary().getById(null as unknown as number)).rejects.toThrow(
      "id must not be null",
    );
  });

  it("create returns created id", async () => {
    server.use(
      http.post(`${BASE_URL}/${ACCOUNT}/towary`, () => HttpResponse.json(created, { status: 201 })),
    );

    const client = createClient();
    const id = await client.towary().create({ kod: "NEW-001", nazwa: "New Product" });
    expect(id).toBe("9999");
  });

  it("update sends PUT request", async () => {
    let called = false;
    server.use(
      http.put(`${BASE_URL}/${ACCOUNT}/towary`, () => {
        called = true;
        return HttpResponse.json(ok);
      }),
    );

    const client = createClient();
    await client.towary().update({ kod: "UPD", nazwa: "Updated", id: 1 });
    expect(called).toBe(true);
  });

  it("deleteById sends DELETE request", async () => {
    let called = false;
    server.use(
      http.delete(`${BASE_URL}/${ACCOUNT}/towary/42`, () => {
        called = true;
        return HttpResponse.json(ok);
      }),
    );

    const client = createClient();
    await client.towary().deleteById(42);
    expect(called).toBe(true);
  });

  it("maps 401 to NoviCloudAuthError", async () => {
    server.use(
      http.get(`${BASE_URL}/${ACCOUNT}/towary/1`, () =>
        HttpResponse.json({ error: "unauthorized" }, { status: 401 }),
      ),
    );

    const client = createClient();
    await expect(client.towary().getById(1)).rejects.toBeInstanceOf(NoviCloudAuthError);
  });

  it("maps 404 to NoviCloudNotFoundError", async () => {
    server.use(
      http.get(`${BASE_URL}/${ACCOUNT}/towary/999`, () =>
        HttpResponse.json({ error: "not found" }, { status: 404 }),
      ),
    );

    const client = createClient();
    await expect(client.towary().getById(999)).rejects.toBeInstanceOf(NoviCloudNotFoundError);
  });

  it("maps 500 to NoviCloudServerError", async () => {
    server.use(
      http.get(`${BASE_URL}/${ACCOUNT}/towary`, () =>
        HttpResponse.json({ error: "server error" }, { status: 500 }),
      ),
    );

    const client = createClient();
    await expect(client.towary().count()).rejects.toBeInstanceOf(NoviCloudServerError);
  });
});

describe("NoviCloudClient lifecycle", () => {
  it("throws after close", () => {
    const client = createClient();
    client.close();
    expect(() => client.towary()).toThrow("NoviCloudClient has been closed");
  });

  it("create rejects null accountName", () => {
    expect(() => NoviCloudClient.create(null as unknown as string, "pass")).toThrow(
      "accountName must not be null",
    );
  });

  it("create rejects null password", () => {
    expect(() => NoviCloudClient.create("account", null as unknown as string)).toThrow(
      "password must not be null",
    );
  });

  it("all 18 resource accessors are available", () => {
    const client = createClient();
    expect(client.towary()).toBeDefined();
    expect(client.asorty()).toBeDefined();
    expect(client.jmiary()).toBeDefined();
    expect(client.stawkiVat()).toBeDefined();
    expect(client.waluty()).toBeDefined();
    expect(client.kraje()).toBeDefined();
    expect(client.formyPlatn()).toBeDefined();
    expect(client.kontrahenci()).toBeDefined();
    expect(client.sklepy()).toBeDefined();
    expect(client.kasy()).toBeDefined();
    expect(client.kasjerzy()).toBeDefined();
    expect(client.dokumenty()).toBeDefined();
    expect(client.pozdok()).toBeDefined();
    expect(client.stanyMag()).toBeDefined();
    expect(client.sprzedaz()).toBeDefined();
    expect(client.rapSprzed()).toBeDefined();
    expect(client.rapPracy()).toBeDefined();
    expect(client.kartyLoj()).toBeDefined();
  });
});
