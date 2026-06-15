import { describe, expect, it } from "vitest";
import {
  corsStrictHttpsEnabled,
  isAllowedLissnerCorsOrigin,
} from "./lissner-cors.js";

describe("isAllowedLissnerCorsOrigin", () => {
  it("allows apex and subdomains with https when strict", () => {
    expect(isAllowedLissnerCorsOrigin("https://lissner.io", true)).toBe(true);
    expect(isAllowedLissnerCorsOrigin("https://www.lissner.io", true)).toBe(
      true,
    );
    expect(isAllowedLissnerCorsOrigin("https://app.lissner.io", true)).toBe(
      true,
    );
    expect(
      isAllowedLissnerCorsOrigin("https://staging.preview.lissner.io", true),
    ).toBe(true);
  });

  it("rejects http for lissner.io when strict", () => {
    expect(isAllowedLissnerCorsOrigin("http://lissner.io", true)).toBe(false);
  });

  it("allows http when not strict (local tooling)", () => {
    expect(isAllowedLissnerCorsOrigin("http://lissner.io", false)).toBe(true);
  });

  it("rejects other registrable domains and typosquats", () => {
    expect(isAllowedLissnerCorsOrigin("https://evil.example", true)).toBe(
      false,
    );
    expect(isAllowedLissnerCorsOrigin("https://notlissner.io", true)).toBe(
      false,
    );
    expect(
      isAllowedLissnerCorsOrigin("https://lissner.io.evil.test", true),
    ).toBe(false);
  });

  it("rejects missing or null sentinel origin", () => {
    expect(isAllowedLissnerCorsOrigin(undefined, true)).toBe(false);
    expect(isAllowedLissnerCorsOrigin("", true)).toBe(false);
    expect(isAllowedLissnerCorsOrigin("null", true)).toBe(false);
  });

  it("rejects malformed origin strings", () => {
    expect(isAllowedLissnerCorsOrigin("not-a-url", true)).toBe(false);
  });
});

describe("corsStrictHttpsEnabled", () => {
  it("reflects NODE_ENV production or BDD_STRICT_CORS", () => {
    const node = process.env.NODE_ENV;
    const bdd = process.env.BDD_STRICT_CORS;
    try {
      delete process.env.BDD_STRICT_CORS;
      process.env.NODE_ENV = "test";
      expect(corsStrictHttpsEnabled()).toBe(false);
      process.env.BDD_STRICT_CORS = "1";
      expect(corsStrictHttpsEnabled()).toBe(true);
    } finally {
      process.env.NODE_ENV = node;
      if (bdd === undefined) {
        delete process.env.BDD_STRICT_CORS;
      } else {
        process.env.BDD_STRICT_CORS = bdd;
      }
    }
  });
});
