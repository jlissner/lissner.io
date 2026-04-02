import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { HttpError } from "../lib/http-error.js";
import { errorHandler } from "./error-handler.js";

vi.mock("../logger.js", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

function mockRes(): {
  res: { status: ReturnType<typeof vi.fn> };
  json: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
} {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { res: { status }, json, status };
}

describe("errorHandler", () => {
  it("uses HttpError code when present", () => {
    const { res, json, status } = mockRes();
    errorHandler(new HttpError(404, "missing", "person_not_found"), {} as never, res as never, vi.fn());
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: "missing", code: "person_not_found" });
  });

  it("falls back to apiErrorCodeForHttpStatus when HttpError omits code", () => {
    const { res, json } = mockRes();
    errorHandler(new HttpError(409, "busy"), {} as never, res as never, vi.fn());
    expect(json).toHaveBeenCalledWith({ error: "busy", code: "conflict" });
  });

  it("maps ZodError to validation_error", () => {
    const { res, json, status } = mockRes();
    const zod = new ZodError([{ code: "custom", message: "bad", path: [] }]);
    errorHandler(zod, {} as never, res as never, vi.fn());
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: "validation_error" }));
  });
});
