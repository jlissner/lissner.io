import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { requireAdminForFullLibraryForceIndex } from "./search.js";

function mockRes() {
  const res = {
    status: vi.fn(function (this: typeof res) {
      return this;
    }),
    json: vi.fn(),
  };
  return res as unknown as Response;
}

describe("requireAdminForFullLibraryForceIndex", () => {
  it("calls next for force without media when user is admin", () => {
    const req = {
      query: { force: "true" },
      body: {},
      jwtUser: { id: 1, email: "a@b.com", isAdmin: true },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    requireAdminForFullLibraryForceIndex(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 403 for force full library when user is not admin", () => {
    const req = {
      query: { force: "true" },
      body: {},
      jwtUser: { id: 1, email: "a@b.com", isAdmin: false },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    requireAdminForFullLibraryForceIndex(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("allows non-admin when force with mediaIds", () => {
    const req = {
      query: { force: "true" },
      body: { mediaIds: ["a", "b"] },
      jwtUser: { id: 1, email: "a@b.com", isAdmin: false },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    requireAdminForFullLibraryForceIndex(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
