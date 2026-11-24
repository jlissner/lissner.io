import { beforeEach, describe, expect, it, vi } from "vitest";

const { attemptRefresh, postMediaUploadWithProgress } = vi.hoisted(() => ({
  attemptRefresh: vi.fn<() => Promise<boolean>>(),
  postMediaUploadWithProgress: vi.fn(),
}));

vi.mock("@/api", () => ({ attemptRefresh }));

vi.mock("./post-media-upload-with-progress.js", () => ({
  postMediaUploadWithProgress,
  isUnauthorizedUploadError: (error: unknown) =>
    error instanceof Error &&
    (error as Error & { status?: number }).status === 401,
}));

import { uploadMediaFilesWithProgress } from "./upload-media-files-with-progress";

const unauthorized = (): Error =>
  Object.assign(new Error("Authentication required"), { status: 401 });

const file = (): File =>
  new File([new Uint8Array(8)], "beach.jpg", { type: "image/jpeg" });

describe("uploadMediaFilesWithProgress on an expired session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Bug: access tokens expire after an hour and the upload XHR never refreshed
   * them, so uploads failed with "Upload failed (401)" while the rest of the app
   * kept working. Reported 2026-11-23 (macOS/Chrome).
   */
  it("refreshes the session once and retries the upload", async () => {
    attemptRefresh.mockResolvedValue(true);
    postMediaUploadWithProgress
      .mockRejectedValueOnce(unauthorized())
      .mockResolvedValueOnce(undefined);

    await uploadMediaFilesWithProgress([file()], () => {});

    expect(attemptRefresh).toHaveBeenCalledTimes(1);
    expect(postMediaUploadWithProgress).toHaveBeenCalledTimes(2);
  });

  it("gives up immediately when the refresh fails", async () => {
    attemptRefresh.mockResolvedValue(false);
    postMediaUploadWithProgress.mockRejectedValue(unauthorized());

    await expect(
      uploadMediaFilesWithProgress([file()], () => {}),
    ).rejects.toThrow("Authentication required");

    expect(attemptRefresh).toHaveBeenCalledTimes(1);
    expect(postMediaUploadWithProgress).toHaveBeenCalledTimes(1);
  });
});
