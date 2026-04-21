import { describe, expect, it } from "vitest";
import { normalizePersonHandle, normalizeTagToken } from "./search-query-normalize.js";
import { parseSearchQuery, parseStructuredSearchQuery } from "./search-query-parser.js";

describe("normalizeTagToken", () => {
  it("canonicalizes tags like storage", () => {
    expect(normalizeTagToken("#Summer2025")).toBe("summer2025");
  });
});

describe("normalizePersonHandle", () => {
  it("matches @joelissner to Joe Lissner", () => {
    expect(normalizePersonHandle("Joe Lissner")).toBe("joelissner");
    expect(normalizePersonHandle("@joelissner")).toBe("joelissner");
  });
});

describe("parseStructuredSearchQuery", () => {
  it("parses (#summer2025 OR #summer2024) AND @joelissner AND water", () => {
    const r = parseStructuredSearchQuery("(#summer2025 OR #summer2024) AND @joelissner AND water");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ast).toEqual({
      kind: "and",
      left: {
        kind: "and",
        left: {
          kind: "or",
          left: { kind: "tag", tag: "summer2025" },
          right: { kind: "tag", tag: "summer2024" },
        },
        right: { kind: "person", handle: "joelissner" },
      },
      right: { kind: "text", text: "water" },
    });
  });

  it("parses a AND b OR c as (a AND b) OR c", () => {
    const r = parseStructuredSearchQuery("a AND b OR c");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ast).toEqual({
      kind: "or",
      left: {
        kind: "and",
        left: { kind: "text", text: "a" },
        right: { kind: "text", text: "b" },
      },
      right: { kind: "text", text: "c" },
    });
  });

  it("parses @a AND NOT @b as AND with NOT binding to @b", () => {
    const r = parseStructuredSearchQuery("@person1 AND NOT @person2");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ast).toEqual({
      kind: "and",
      left: { kind: "person", handle: "person1" },
      right: {
        kind: "not",
        child: { kind: "person", handle: "person2" },
      },
    });
  });

  it("joins adjacent unary factors with implicit AND", () => {
    const r = parseStructuredSearchQuery("@person snowboarding");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ast).toEqual({
      kind: "and",
      left: { kind: "person", handle: "person" },
      right: { kind: "text", text: "snowboarding" },
    });
  });

  it("parses NOT NOT @a as double negation", () => {
    const r = parseStructuredSearchQuery("NOT NOT @x");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ast).toEqual({
      kind: "not",
      child: {
        kind: "not",
        child: { kind: "person", handle: "x" },
      },
    });
  });

  it("rejects unclosed paren", () => {
    const r = parseStructuredSearchQuery("(#broken");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/Missing|Unexpected|Invalid/i);
  });
});

describe("parseSearchQuery", () => {
  it("uses legacy path for plain terms without operators", () => {
    const r = parseSearchQuery("holiday photos");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ast).toEqual({ kind: "legacy", text: "holiday photos" });
  });

  it("does not use legacy path when NOT appears", () => {
    const r = parseSearchQuery("#a AND NOT #b");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ast.kind).not.toBe("legacy");
  });

  it("parses structured when # is present", () => {
    const r = parseSearchQuery("#summer");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ast).toEqual({ kind: "tag", tag: "summer" });
  });
});
