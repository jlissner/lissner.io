import { describe, expect, it, vi } from "vitest";
import { apiErrorCodeForHttpStatus, sendApiError } from "./api-error.js";

describe("apiErrorCodeForHttpStatus", () => {
  it("maps common HTTP statuses to stable codes", () => {
    expect(apiErrorCodeForHttpStatus(400)).toBe("bad_request");
    expect(apiErrorCodeForHttpStatus(401)).toBe("unauthorized");
    expect(apiErrorCodeForHttpStatus(403)).toBe("forbidden");
    expect(apiErrorCodeForHttpStatus(404)).toBe("not_found");
    expect(apiErrorCodeForHttpStatus(409)).toBe("conflict");
    expect(apiErrorCodeForHttpStatus(503)).toBe("service_unavailable");
  });

  it("defaults unknown statuses to internal_error", () => {
    expect(apiErrorCodeForHttpStatus(418)).toBe("internal_error");
    expect(apiErrorCodeForHttpStatus(500)).toBe("internal_error");
  });
});

describe("sendApiError", () => {
  it("sets status and merges extra fields into JSON", () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status } as unknown as Parameters<typeof sendApiError>[0];
    sendApiError(res, 409, "busy", "index_in_progress", { jobId: "j1" });
    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      error: "busy",
      code: "index_in_progress",
      jobId: "j1",
    });
  });
});
