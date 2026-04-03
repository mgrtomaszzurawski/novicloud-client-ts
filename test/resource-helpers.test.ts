import { describe, it, expect } from "vitest";
import {
  extractSelfLink,
  extractSize,
  extractOnPage,
  extractDane,
  extractLinkId,
  requireNotNull,
  toLink,
} from "../src/resource-helpers.js";

describe("extractSelfLink", () => {
  it("extracts self from links", () => {
    expect(extractSelfLink({ links: { self: "http://test" } })).toBe("http://test");
  });

  it("returns undefined when links is null", () => {
    expect(extractSelfLink({ links: null })).toBeUndefined();
  });

  it("returns undefined when links is undefined", () => {
    expect(extractSelfLink({})).toBeUndefined();
  });

  it("returns undefined when self is undefined", () => {
    expect(extractSelfLink({ links: {} })).toBeUndefined();
  });
});

describe("extractSize", () => {
  it("returns size when present", () => {
    expect(extractSize({ size: 42 })).toBe(42);
  });

  it("returns -1 when null", () => {
    expect(extractSize({ size: null })).toBe(-1);
  });

  it("returns -1 when undefined", () => {
    expect(extractSize({})).toBe(-1);
  });

  it("returns 0 when size is 0", () => {
    expect(extractSize({ size: 0 })).toBe(0);
  });
});

describe("extractOnPage", () => {
  it("returns onPage when present", () => {
    expect(extractOnPage({ onPage: 50 })).toBe(50);
  });

  it("returns -1 when null", () => {
    expect(extractOnPage({ onPage: null })).toBe(-1);
  });
});

describe("extractDane", () => {
  it("returns dane array", () => {
    expect(extractDane({ dane: [1, 2, 3] })).toEqual([1, 2, 3]);
  });

  it("returns empty array when null", () => {
    expect(extractDane({ dane: null })).toEqual([]);
  });

  it("returns empty array when undefined", () => {
    expect(extractDane({})).toEqual([]);
  });
});

describe("extractLinkId", () => {
  it("extracts id from Link", () => {
    expect(extractLinkId({ id: "42" })).toBe("42");
  });

  it("returns undefined for null", () => {
    expect(extractLinkId(null)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(extractLinkId(undefined)).toBeUndefined();
  });
});

describe("requireNotNull", () => {
  it("passes for non-null values", () => {
    expect(() => requireNotNull(42, "id")).not.toThrow();
    expect(() => requireNotNull("", "name")).not.toThrow();
    expect(() => requireNotNull(0, "count")).not.toThrow();
    expect(() => requireNotNull(false, "flag")).not.toThrow();
  });

  it("throws for null", () => {
    expect(() => requireNotNull(null, "id")).toThrow("id must not be null");
  });

  it("throws for undefined", () => {
    expect(() => requireNotNull(undefined, "id")).toThrow("id must not be null");
  });
});

describe("toLink", () => {
  it("creates Link from number id", () => {
    expect(toLink(42)).toEqual({ id: "42" });
  });

  it("creates Link from string id", () => {
    expect(toLink("abc")).toEqual({ id: "abc" });
  });
});
