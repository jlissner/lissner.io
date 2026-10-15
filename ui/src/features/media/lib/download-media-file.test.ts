import { describe, expect, it, vi } from "vitest";

vi.mock("@/api", () => ({
  prependApiUrl: (path: string) => path,
}));

import {
  BULK_DOWNLOAD_STAGGER_MS,
  downloadMediaFiles,
} from "./download-media-file";

describe("downloadMediaFiles", () => {
  /**
   * Bug: selecting multiple images only downloaded one because browsers
   * cancel concurrent programmatic <a download> clicks in the same tick.
   * Reported 2026-10-15.
   */
  it("schedules each selected file on a staggered delay", () => {
    const downloads: string[] = [];
    const schedule = vi.fn((task: () => void, _delayMs: number) => {
      task();
    });

    downloadMediaFiles(
      [
        { mediaId: "id-a", filename: "a.jpg" },
        { mediaId: "id-b", filename: "b.jpg" },
        { mediaId: "id-c", filename: "c.jpg" },
      ],
      {
        downloadOne: (mediaId) => {
          downloads.push(mediaId);
        },
        schedule,
      },
    );

    expect(schedule.mock.calls.map(([, delayMs]) => delayMs)).toEqual([
      0,
      BULK_DOWNLOAD_STAGGER_MS,
      BULK_DOWNLOAD_STAGGER_MS * 2,
    ]);
    expect(downloads).toEqual(["id-a", "id-b", "id-c"]);
  });

  it("does nothing when the selection is empty", () => {
    const schedule = vi.fn();
    downloadMediaFiles([], {
      downloadOne: () => {
        throw new Error("should not download");
      },
      schedule,
    });
    expect(schedule).not.toHaveBeenCalled();
  });
});
