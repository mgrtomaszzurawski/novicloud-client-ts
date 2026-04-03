import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { NoviCloudClient } from "../../src/client.js";
import stanymagList from "../fixtures/stanymag-list.json";
import stanymagBytowar from "../fixtures/stanymag-bytowar.json";
import stanymagSingle from "../fixtures/stanymag-single.json";
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

describe("StanyMagClient integration (special endpoints)", () => {
  it("list returns stock levels", async () => {
    server.use(http.get(`${BASE_URL}/${ACCOUNT}/stanymag`, () => HttpResponse.json(stanymagList)));

    const client = createClient();
    const items: unknown[] = [];
    for await (const item of client.stanyMag().list()) {
      items.push(item);
    }

    expect(items).toHaveLength(1);
    const first = items[0] as Record<string, unknown>;
    expect(first.ilosc).toBe(25.0);
  });

  it("count returns total", async () => {
    server.use(http.get(`${BASE_URL}/${ACCOUNT}/stanymag`, () => HttpResponse.json(stanymagList)));

    const client = createClient();
    expect(await client.stanyMag().count()).toBe(1);
  });

  it("listByTowar returns stock for specific product", async () => {
    server.use(
      http.get(`${BASE_URL}/${ACCOUNT}/stanymag/2`, () => HttpResponse.json(stanymagBytowar)),
    );

    const client = createClient();
    const items = await client.stanyMag().listByTowar(2);
    expect(items).toHaveLength(1);
    expect(items[0].ilosc).toBe(25.0);
  });

  it("listByTowar throws on null idTowaru", async () => {
    const client = createClient();
    await expect(client.stanyMag().listByTowar(null as unknown as number)).rejects.toThrow(
      "idTowaru must not be null",
    );
  });

  it("getByTowarAndSklep returns single stock level", async () => {
    server.use(
      http.get(`${BASE_URL}/${ACCOUNT}/stanymag/2/1`, () => HttpResponse.json(stanymagSingle)),
    );

    const client = createClient();
    const item = await client.stanyMag().getByTowarAndSklep(2, 1);
    expect(item.ilosc).toBe(25.0);
  });

  it("getByTowarAndSklep throws on null idTowaru", async () => {
    const client = createClient();
    await expect(
      client.stanyMag().getByTowarAndSklep(null as unknown as number, 1),
    ).rejects.toThrow("idTowaru must not be null");
  });

  it("getByTowarAndSklep throws on null idSklepu", async () => {
    const client = createClient();
    await expect(
      client.stanyMag().getByTowarAndSklep(2, null as unknown as number),
    ).rejects.toThrow("idSklepu must not be null");
  });

  it("update sends PUT request", async () => {
    let called = false;
    server.use(
      http.put(`${BASE_URL}/${ACCOUNT}/stanymag`, () => {
        called = true;
        return HttpResponse.json(ok);
      }),
    );

    const client = createClient();
    await client.stanyMag().update({ ilosc: 30.0 });
    expect(called).toBe(true);
  });

  it("update throws on null stanMag", async () => {
    const client = createClient();
    await expect(client.stanyMag().update(null as unknown as never)).rejects.toThrow(
      "stanMag must not be null",
    );
  });
});
