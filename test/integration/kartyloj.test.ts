import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { NoviCloudClient } from "../../src/client.js";
import kartylojList from "../fixtures/kartyloj-list.json";
import kartylojSingle from "../fixtures/kartyloj-single.json";
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

describe("KartyLojClient integration (special: getByKod, no delete)", () => {
  it("list returns loyalty cards", async () => {
    server.use(
      http.get(`${BASE_URL}/${ACCOUNT}/f-karty-loj`, () => HttpResponse.json(kartylojList)),
    );

    const client = createClient();
    const items: unknown[] = [];
    for await (const item of client.kartyLoj().list()) {
      items.push(item);
    }

    expect(items).toHaveLength(1);
    const first = items[0] as Record<string, unknown>;
    expect(first.kod).toBe("LOJ-001");
    expect(first.typ).toBe(1);
    expect(first.waznaOd).toBeInstanceOf(Date);
    expect(first.waznaDo).toBeInstanceOf(Date);
    expect(first.posiadacz).toBe("Jan Kowalski");
    expect(first.opis1).toBe("VIP");
    expect(first.opis2).toBeUndefined();
    expect(first.uniewazniono).toBeUndefined();
    expect(first.nazwiskoImie).toBe("Kowalski Jan");
    expect(first.skrot).toBe("JK");
    expect(first.telefon).toBe("600100200");
    expect(first.email).toBe("jan@example.com");
    expect(first.miejscowosc).toBe("Warszawa");
    expect(first.ulica).toBe("Nowy Swiat");
    expect(first.nrDomu).toBe("15");
    expect(first.nrLokalu).toBe("3");
    expect(first.kodPoczt).toBe("00-029");
    expect(first.poczta).toBe("Warszawa");
    expect(first.nip).toBe("1112223344");
    expect(first.dataUrodz).toBeInstanceOf(Date);
    expect(first.plec).toBe(1);
  });

  it("list with query passes filter params", async () => {
    let capturedUrl = "";
    server.use(
      http.get(`${BASE_URL}/${ACCOUNT}/f-karty-loj`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(kartylojList);
      }),
    );

    const client = createClient();
    for await (const _item of client.kartyLoj().list({ kod: "LOJ-001" })) {
      // consume
    }

    expect(capturedUrl).toContain("kod=LOJ-001");
  });

  it("count returns total", async () => {
    server.use(
      http.get(`${BASE_URL}/${ACCOUNT}/f-karty-loj`, () => HttpResponse.json(kartylojList)),
    );

    const client = createClient();
    expect(await client.kartyLoj().count()).toBe(1);
  });

  it("getByKod returns single card", async () => {
    server.use(
      http.get(`${BASE_URL}/${ACCOUNT}/f-karty-loj/LOJ-001`, () =>
        HttpResponse.json(kartylojSingle),
      ),
    );

    const client = createClient();
    const card = await client.kartyLoj().getByKod("LOJ-001");
    expect(card.kod).toBe("LOJ-001");
    expect(card.posiadacz).toBe("Jan Kowalski");
  });

  it("getByKod throws on null kod", async () => {
    const client = createClient();
    await expect(client.kartyLoj().getByKod(null as unknown as string)).rejects.toThrow(
      "kod must not be null",
    );
  });

  it("create returns created id", async () => {
    server.use(
      http.post(`${BASE_URL}/${ACCOUNT}/f-karty-loj`, () =>
        HttpResponse.json(created, { status: 201 }),
      ),
    );

    const client = createClient();
    const id = await client.kartyLoj().create({
      kod: "LOJ-002",
      posiadacz: "Anna Nowak",
    });
    expect(id).toBe("9999");
  });

  it("update sends PUT request", async () => {
    let called = false;
    server.use(
      http.put(`${BASE_URL}/${ACCOUNT}/f-karty-loj`, () => {
        called = true;
        return HttpResponse.json(ok);
      }),
    );

    const client = createClient();
    await client.kartyLoj().update({
      kod: "LOJ-001",
      posiadacz: "Jan Kowalski-Nowak",
    });
    expect(called).toBe(true);
  });

  it("create throws on null kartaLojalnosciowa", async () => {
    const client = createClient();
    await expect(client.kartyLoj().create(null as unknown as never)).rejects.toThrow(
      "kartaLojalnosciowa must not be null",
    );
  });
});
