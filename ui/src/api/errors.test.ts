import { describe, expect, it } from "vitest";
import { ApiError, errorMessage } from "./errors";

describe("errorMessage", () => {
  it("returns the ApiError message when given an ApiError", () => {
    const err = new ApiError(409, "Email already in use", null);
    expect(errorMessage(err, "fallback")).toBe("Email already in use");
  });

  it("returns the fallback for a non-ApiError value", () => {
    expect(errorMessage(new Error("network down"), "Request failed")).toBe(
      "Request failed",
    );
  });

  it("returns the fallback for non-error values", () => {
    expect(errorMessage("boom", "Request failed")).toBe("Request failed");
    expect(errorMessage(undefined, "Request failed")).toBe("Request failed");
  });
});
