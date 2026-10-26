import { describe, expect, it } from "vitest";
import {
  fileIssueCodeLabel,
  formatBackupDisplayDate,
  formatBytes,
  sortDbBackupsByNewest,
} from "./format.js";

describe("formatBytes", () => {
  it("renders sub-kilobyte sizes as bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
  });

  it("rounds to a whole number once the value is >= 10", () => {
    expect(formatBytes(1024 * 15)).toBe("15 KB");
    expect(formatBytes(1024 * 1024 * 25)).toBe("25 MB");
  });

  it("keeps one decimal for small fractional values", () => {
    expect(formatBytes(1024 * 1.5)).toBe("1.5 KB");
  });

  it("scales into TB", () => {
    expect(formatBytes(1024 ** 4 * 3)).toBe("3 TB");
  });
});

describe("fileIssueCodeLabel", () => {
  it("maps known codes to friendly labels", () => {
    expect(fileIssueCodeLabel("ffprobe_failed")).toBe(
      "Video unreadable (ffprobe)",
    );
    expect(fileIssueCodeLabel("file_missing")).toBe("File not on disk");
  });

  it("falls back to the raw code when unknown", () => {
    expect(fileIssueCodeLabel("something_new")).toBe("something_new");
  });
});

describe("formatBackupDisplayDate", () => {
  it("returns the original string for an invalid date", () => {
    expect(formatBackupDisplayDate("not-a-date")).toBe("not-a-date");
  });

  it("formats a valid ISO date to a localized string", () => {
    const out = formatBackupDisplayDate("2026-02-01T00:00:00.000Z");
    expect(out).not.toBe("2026-02-01T00:00:00.000Z");
    expect(out.length).toBeGreaterThan(0);
  });
});

describe("sortDbBackupsByNewest", () => {
  it("orders backups newest-first without mutating the input", () => {
    const input = [
      { key: "a", lastModified: "2026-01-01T00:00:00.000Z" },
      { key: "b", lastModified: "2026-03-01T00:00:00.000Z" },
      { key: "c", lastModified: "2026-02-01T00:00:00.000Z" },
    ];
    const sorted = sortDbBackupsByNewest(input);
    expect(sorted.map((b) => b.key)).toEqual(["b", "c", "a"]);
    expect(input.map((b) => b.key)).toEqual(["a", "b", "c"]);
  });
});
