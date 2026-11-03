import { describe, expect, it } from "vitest";
import { getDistinctMonths, sqlYearMonth } from "./media-read.js";

describe("sqlYearMonth", () => {
  it("casts so SUBSTR works on timestamptz", () => {
    expect(sqlYearMonth("uploaded_at")).toBe(
      "SUBSTR(CAST(uploaded_at AS TEXT), 1, 7)",
    );
    expect(sqlYearMonth("COALESCE(m.date_taken, m.uploaded_at)")).toBe(
      "SUBSTR(CAST(COALESCE(m.date_taken, m.uploaded_at) AS TEXT), 1, 7)",
    );
  });
});

describe("getDistinctMonths", () => {
  it("returns YYYY-MM keys from the configured media DB", async () => {
    const months = await getDistinctMonths("uploaded");
    expect(Array.isArray(months)).toBe(true);
    for (const month of months) {
      expect(month).toMatch(/^\d{4}-\d{2}$/);
    }
  });
});
