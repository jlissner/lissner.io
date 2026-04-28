import { describe, expect, it, vi } from "vitest";

vi.mock("../../services/people-directory-admin-service.js", () => ({
  listDirectory: vi.fn(),
}));

import type { NextFunction } from "express";
import { requireAdmin } from "../../auth/middleware.js";
import { createAdminPeopleDirectoryListHandler } from "./people-directory-routes.js";
import { listDirectory } from "../../services/people-directory-admin-service.js";

type TestReq = {
  jwtUser?: { id: number; isAdmin: boolean };
};

function mockRes() {
  const res = {
    status: vi.fn((_code: number) => res),
    json: vi.fn((_body: unknown) => res),
  };
  return res;
}

describe("admin people directory routes", () => {
  it("rejects non-admin requests with 403", async () => {
    const req: TestReq = { jwtUser: { id: 1, isAdmin: false } };
    const res = mockRes();
    const next: NextFunction = vi.fn();

    requireAdmin(req as never, res as never, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "admin_required" }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("allows admin requests and returns directory payload from service", async () => {
    vi.mocked(listDirectory).mockReturnValue({
      ok: true,
      value: [
        {
          personId: 1,
          name: "Alice",
          email: null,
          canLogin: false,
          isAdmin: false,
          isIdentity: false,
          whitelistEntryId: null,
        },
      ],
    });

    const req: TestReq = { jwtUser: { id: 1, isAdmin: true } };
    const res = mockRes();
    const next: NextFunction = vi.fn();

    requireAdmin(req as never, res as never, next);
    expect(next).toHaveBeenCalledTimes(1);

    createAdminPeopleDirectoryListHandler({
      listDirectory: listDirectory as never,
    })(req as never, res as never);

    expect(listDirectory).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith([
      {
        personId: 1,
        name: "Alice",
        email: null,
        canLogin: false,
        isAdmin: false,
        isIdentity: false,
        whitelistEntryId: null,
      },
    ]);
  });
});
