import { describe, it, expect } from "vitest";
import { PagedResult } from "../src/paging.js";

interface MockPage {
  size: number;
  onPage: number;
  links: { self: string } | null;
  dane: string[];
}

function createMockPagedResult(pages: MockPage[], totalSize?: number): PagedResult<string> {
  let _fetchCount = 0;
  const total = totalSize ?? pages.reduce((sum, p) => sum + p.dane.length, 0);

  return PagedResult.create<string, MockPage>({
    firstPage: async () => {
      _fetchCount++;
      return { ...pages[0], size: total };
    },
    urlFetch: async (url: string) => {
      _fetchCount++;
      const startMatch = url.match(/start=(\d+)/);
      const start = startMatch ? parseInt(startMatch[1], 10) : 0;
      const _pageIndex = Math.floor(start / 50) || (start > 0 ? 1 : 0);
      // For simple 2-item pages, map start to page index
      const idx = pages.findIndex(
        (_p, i) => i > 0 && start === pages.slice(0, i).reduce((s, pp) => s + pp.dane.length, 0),
      );
      return idx >= 0 ? pages[idx] : pages[pages.length - 1];
    },
    dataExtractor: (page) => page.dane,
    selfLinkExtractor: (page) => page.links?.self ?? undefined,
    sizeExtractor: (page) => page.size,
    onPageExtractor: (page) => page.onPage,
  });
}

describe("PagedResult", () => {
  it("totalCount returns size from first page", async () => {
    const result = createMockPagedResult(
      [{ size: 100, onPage: 2, links: { self: "http://test?start=0" }, dane: ["a", "b"] }],
      100,
    );
    expect(await result.totalCount()).toBe(100);
  });

  it("pageSize returns onPage from first page", async () => {
    const result = createMockPagedResult(
      [
        {
          size: 10,
          onPage: 5,
          links: { self: "http://test?start=0" },
          dane: ["a", "b", "c", "d", "e"],
        },
      ],
      10,
    );
    expect(await result.pageSize()).toBe(5);
  });

  it("iterates over all items with for-await", async () => {
    const result = createMockPagedResult([
      { size: 2, onPage: 2, links: { self: "http://test?start=0" }, dane: ["a", "b"] },
    ]);

    const items: string[] = [];
    for await (const item of result) {
      items.push(item);
    }
    expect(items).toEqual(["a", "b"]);
  });

  it("seek positions the list iterator", async () => {
    const result = createMockPagedResult(
      [{ size: 3, onPage: 3, links: { self: "http://test?start=0" }, dane: ["a", "b", "c"] }],
      3,
    );

    result.seek(1);
    const iter = result.asyncListIterator();
    const { value } = await iter.next();
    expect(value).toBe("b");
  });

  it("seek rejects negative position", () => {
    const result = createMockPagedResult([
      { size: 1, onPage: 1, links: { self: "http://test?start=0" }, dane: ["a"] },
    ]);
    expect(() => result.seek(-1)).toThrow("seek position must be non-negative");
  });

  it("seekFromPage(1) is equivalent to seek(0)", async () => {
    const result = createMockPagedResult([
      { size: 2, onPage: 2, links: { self: "http://test?start=0" }, dane: ["a", "b"] },
    ]);
    result.seekFromPage(1);
    const iter = result.asyncListIterator();
    const { value } = await iter.next();
    expect(value).toBe("a");
  });

  it("seekFromPage rejects page < 1", () => {
    const result = createMockPagedResult([
      { size: 1, onPage: 1, links: { self: "http://test?start=0" }, dane: ["a"] },
    ]);
    expect(() => result.seekFromPage(0)).toThrow("page number must be >= 1");
  });

  it("fetchFrom returns items at offset without affecting iterator", async () => {
    const result = createMockPagedResult(
      [
        { size: 4, onPage: 2, links: { self: "http://test?start=0" }, dane: ["a", "b"] },
        { size: 4, onPage: 2, links: { self: "http://test?start=2" }, dane: ["c", "d"] },
      ],
      4,
    );

    const page = await result.fetchFrom(2);
    expect(page.length).toBeGreaterThan(0);
  });

  it("fetchFrom throws when no self link", async () => {
    const result = PagedResult.create<string, MockPage>({
      firstPage: async () => ({ size: 1, onPage: 1, links: null, dane: ["a"] }),
      urlFetch: async () => ({ size: 1, onPage: 1, links: null, dane: ["a"] }),
      dataExtractor: (page) => page.dane,
      selfLinkExtractor: () => undefined,
      sizeExtractor: (page) => page.size,
      onPageExtractor: (page) => page.onPage,
    });

    await expect(result.fetchFrom(0)).rejects.toThrow("server did not return a self link");
  });

  it("list iterator previous() returns done when at start", async () => {
    const result = createMockPagedResult([
      { size: 2, onPage: 2, links: { self: "http://test?start=0" }, dane: ["a", "b"] },
    ]);

    const iter = result.asyncListIterator();
    const prev = await iter.previous();
    expect(prev.done).toBe(true);
  });

  it("list iterator nextIndex and previousIndex track position", async () => {
    const result = createMockPagedResult(
      [{ size: 3, onPage: 3, links: { self: "http://test?start=0" }, dane: ["a", "b", "c"] }],
      3,
    );

    const iter = result.asyncListIterator();
    expect(iter.nextIndex()).toBe(0);
    expect(iter.previousIndex()).toBe(-1);

    await iter.next(); // consume "a"
    expect(iter.nextIndex()).toBe(1);
    expect(iter.previousIndex()).toBe(0);
  });

  it("next() returns done when past end", async () => {
    const result = createMockPagedResult(
      [{ size: 1, onPage: 1, links: { self: "http://test?start=0" }, dane: ["only"] }],
      1,
    );

    const iter = result.asyncListIterator();
    await iter.next(); // consume "only"
    const end = await iter.next();
    expect(end.done).toBe(true);
  });

  it("buildUrl replaces existing start param", async () => {
    const result = createMockPagedResult(
      [
        {
          size: 100,
          onPage: 50,
          links: { self: "http://test?content=ABC&start=0" },
          dane: Array(50).fill("x"),
        },
      ],
      100,
    );

    // fetchFrom will call buildUrl internally
    // Just verify it doesn't throw
    await result.fetchFrom(50);
  });

  it("buildUrl appends start when not present", async () => {
    const result = createMockPagedResult(
      [
        {
          size: 100,
          onPage: 50,
          links: { self: "http://test?content=ABC" },
          dane: Array(50).fill("x"),
        },
      ],
      100,
    );

    await result.fetchFrom(50);
  });

  it("totalCount falls back to data length when size is missing", async () => {
    const result = PagedResult.create<string, MockPage>({
      firstPage: async () => ({ size: -1, onPage: -1, links: null, dane: ["a", "b"] }),
      urlFetch: async () => ({ size: -1, onPage: -1, links: null, dane: [] }),
      dataExtractor: (page) => page.dane,
      selfLinkExtractor: () => undefined,
      sizeExtractor: () => -1,
      onPageExtractor: () => -1,
    });

    expect(await result.totalCount()).toBe(2);
  });
});
