/**
 * Lazy, random-access paginated result set.
 *
 * Wraps the server's link-based pagination into an AsyncIterable with
 * seek(), fetchFrom(), and totalCount()/pageSize() metadata.
 *
 * Port of Java PagedResult (ADR-051).
 *
 * @example
 * ```ts
 * const result = client.towary().list({ aktywny: true });
 *
 * // Forward iteration (most common)
 * for await (const towar of result) {
 *   console.log(towar.nazwa);
 * }
 *
 * // Metadata
 * const total = await result.totalCount();
 *
 * // Random access
 * result.seek(100);
 * const iter = result.asyncListIterator();
 * const item = await iter.next();
 *
 * // Fetch a page directly
 * const page = await result.fetchFrom(50);
 * ```
 *
 * @module
 */

const SERVER_PAGE_SIZE = 50;
const REGEX_START_PARAM = /([?&])start=\d+/;
const UNINITIALIZED = -1;

interface PageInfo<T> {
  readonly firstPageData: T[];
  readonly totalCount: number;
  readonly pageSize: number;
  readonly selfUrl: string | undefined;
}

interface PagedResultConfig<T, P> {
  /** Fetches the first page (existing listPage call). */
  firstPage: () => Promise<P>;
  /** Fetches any page by absolute URL. */
  urlFetch: (url: string) => Promise<P>;
  /** Extracts and maps items from a raw page response. */
  dataExtractor: (page: P) => T[];
  /** Extracts links.self URL from a page response (may return undefined). */
  selfLinkExtractor: (page: P) => string | undefined;
  /** Extracts the total record count (size field). Returns -1 if missing. */
  sizeExtractor: (page: P) => number;
  /** Extracts records-on-this-page (on_page field). Returns -1 if missing. */
  onPageExtractor: (page: P) => number;
}

/**
 * Lazy, random-access paginated result.
 *
 * Returned by all resource client `list()` methods. First page is fetched lazily
 * on first access (iteration, totalCount, pageSize, fetchFrom).
 *
 * Not thread-safe; intended for single-consumer use.
 *
 * @typeParam T - The item type (e.g. Towar, Waluta)
 */
export class PagedResult<T> implements AsyncIterable<T> {
  private pageInfo: PageInfo<T> | undefined;
  private seekPosition = 0;

  private readonly config: PagedResultConfig<T, unknown>;

  private constructor(config: PagedResultConfig<T, unknown>) {
    this.config = config;
  }

  static create<T, P>(config: PagedResultConfig<T, P>): PagedResult<T> {
    return new PagedResult<T>(config as unknown as PagedResultConfig<T, unknown>);
  }

  // -----------------------------------------------------------------------
  // Metadata
  // -----------------------------------------------------------------------

  /** Total record count from the server's `size` field. Triggers first page fetch if needed. */
  async totalCount(): Promise<number> {
    const info = await this.ensureInitialized();
    return info.totalCount;
  }

  /** Records on the first page (server's `on_page` field, 1-50). Triggers first page fetch if needed. */
  async pageSize(): Promise<number> {
    const info = await this.ensureInitialized();
    return info.pageSize;
  }

  // -----------------------------------------------------------------------
  // Random access
  // -----------------------------------------------------------------------

  /**
   * Position the next iterator at the given zero-based record offset.
   * Does NOT trigger an HTTP request.
   */
  seek(n: number): void {
    if (n < 0) {
      throw new Error(`seek position must be non-negative: ${n}`);
    }
    this.seekPosition = n;
  }

  /**
   * Position the next iterator at the first record of a 1-based page number.
   * Uses fixed SERVER_PAGE_SIZE (50), not the actual first-page size.
   */
  seekFromPage(pageNumber: number): void {
    if (pageNumber < 1) {
      throw new Error(`page number must be >= 1: ${pageNumber}`);
    }
    this.seek((pageNumber - 1) * SERVER_PAGE_SIZE);
  }

  /**
   * Fetch a single page of records starting at the given global offset.
   * Server returns at most 50 records per page.
   * Does NOT affect iterator position set by seek().
   *
   * @param start - Zero-based record offset
   * @returns Array of items on that page
   * @throws Error if server did not return a self link (required for URL construction)
   */
  async fetchFrom(start: number): Promise<T[]> {
    const info = await this.ensureInitialized();
    const url = this.buildUrl(info, start);
    const page = await this.config.urlFetch(url);
    return this.config.dataExtractor(page);
  }

  // -----------------------------------------------------------------------
  // AsyncIterable - forward-only from position 0
  // -----------------------------------------------------------------------

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return this.createIterator(0);
  }

  /**
   * Returns a bidirectional async iterator starting at the last seek() position.
   */
  asyncListIterator(): AsyncPagedListIterator<T> {
    return this.createIterator(this.seekPosition);
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private async ensureInitialized(): Promise<PageInfo<T>> {
    if (this.pageInfo != null) return this.pageInfo;

    const raw = await this.config.firstPage();
    const data = this.config.dataExtractor(raw);
    const size = this.config.sizeExtractor(raw);
    const onPage = this.config.onPageExtractor(raw);

    this.pageInfo = {
      firstPageData: data,
      totalCount: size >= 0 ? size : data.length,
      pageSize: onPage >= 0 ? onPage : data.length,
      selfUrl: this.config.selfLinkExtractor(raw),
    };
    return this.pageInfo;
  }

  private buildUrl(info: PageInfo<T>, start: number): string {
    const selfUrl = info.selfUrl;
    if (selfUrl == null) {
      throw new Error("Cannot perform random access: server did not return a self link");
    }

    if (REGEX_START_PARAM.test(selfUrl)) {
      return selfUrl.replace(REGEX_START_PARAM, `$1start=${start}`);
    }
    const separator = selfUrl.includes("?") ? "&" : "?";
    return `${selfUrl}${separator}start=${start}`;
  }

  private createIterator(initialPosition: number): AsyncPagedListIterator<T> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    let cursor = initialPosition;
    let page: T[] | undefined;
    let pageStart = UNINITIALIZED;

    async function ensurePageForCursor(): Promise<void> {
      if (page != null) return;

      const info = await self.ensureInitialized();
      if (cursor < info.firstPageData.length && info.firstPageData.length > 0) {
        // Cursor falls within the already-fetched first page - reuse it
        page = info.firstPageData;
        pageStart = 0;
      } else {
        const url = self.buildUrl(info, cursor);
        const raw = await self.config.urlFetch(url);
        page = self.config.dataExtractor(raw);
        pageStart = cursor;
      }
    }

    const iterator: AsyncPagedListIterator<T> = {
      async next(): Promise<IteratorResult<T>> {
        const info = await self.ensureInitialized();
        if (cursor >= info.totalCount) {
          return { done: true, value: undefined };
        }

        await ensurePageForCursor();

        // Page boundary: need next page
        if (cursor >= pageStart + page!.length) {
          pageStart = pageStart + page!.length;
          const url = self.buildUrl(info, pageStart);
          const raw = await self.config.urlFetch(url);
          page = self.config.dataExtractor(raw);
        }

        const value = page![cursor - pageStart];
        cursor++;
        return { done: false, value };
      },

      async previous(): Promise<IteratorResult<T>> {
        if (cursor <= 0) {
          return { done: true, value: undefined };
        }

        await ensurePageForCursor();

        // Page boundary: need previous page
        if (cursor <= pageStart) {
          const prevStart = Math.max(0, pageStart - SERVER_PAGE_SIZE);
          const info = await self.ensureInitialized();
          const url = self.buildUrl(info, prevStart);
          const raw = await self.config.urlFetch(url);
          page = self.config.dataExtractor(raw);
          pageStart = prevStart;
        }

        cursor--;
        return { done: false, value: page![cursor - pageStart] };
      },

      nextIndex(): number {
        return cursor;
      },

      previousIndex(): number {
        return cursor - 1;
      },

      [Symbol.asyncIterator]() {
        return iterator;
      },
    };

    return iterator;
  }
}

/**
 * Bidirectional async iterator with position tracking.
 *
 * Supports both forward ({@link next}) and backward ({@link previous}) traversal.
 * Page boundary crossings cost one HTTP request each direction.
 * Read-only: no set(), add(), or remove().
 */
export interface AsyncPagedListIterator<T> extends AsyncIterator<T> {
  /** Advance to the next record. Returns `{ done: true }` when past the end. */
  next(): Promise<IteratorResult<T>>;
  /** Move to the previous record. Returns `{ done: true }` when before the start. */
  previous(): Promise<IteratorResult<T>>;
  /** Current cursor position (zero-based). Same as the index of the next record to be returned by next(). */
  nextIndex(): number;
  /** Index of the record that would be returned by previous(). -1 if at the start. */
  previousIndex(): number;
  [Symbol.asyncIterator](): AsyncPagedListIterator<T>;
}
