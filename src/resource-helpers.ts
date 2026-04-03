/**
 * Shared helpers for resource clients.
 * Extracts pagination metadata from list response envelopes.
 */

const UNKNOWN = -1;

/** Extract links.self from any list response envelope. */
export function extractSelfLink(response: {
  links?: { self?: string } | null;
}): string | undefined {
  return response.links?.self ?? undefined;
}

/** Extract total count (size field) from list response. */
export function extractSize(response: { size?: number | null }): number {
  return response.size ?? UNKNOWN;
}

/** Extract on_page from list response. */
export function extractOnPage(response: { onPage?: number | null }): number {
  return response.onPage ?? UNKNOWN;
}

/** Extract dane array, defaulting to empty. */
export function extractDane<T>(response: { dane?: T[] | null }): T[] {
  return response.dane ?? [];
}

/** Extract id from Link object. */
export function extractLinkId(link: { id?: string } | null | undefined): string | undefined {
  return link?.id ?? undefined;
}

/** Null guard - throws IllegalArgumentException equivalent. */
export function requireNotNull(
  value: unknown,
  fieldName: string,
): asserts value is NonNullable<typeof value> {
  if (value == null) {
    throw new Error(`${fieldName} must not be null`);
  }
}

/** Build a Link object from a string ID (for create/update bodies). */
export function toLink(id: string | number): { id: string } {
  return { id: String(id) };
}
