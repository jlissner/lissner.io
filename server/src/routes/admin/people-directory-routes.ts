import { Router } from "express";
import { requireAdmin } from "../../auth/middleware.js";
import { getAuthUser } from "../../auth/middleware.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { parseWithSchema } from "../../validation/parse.js";
import {
  peopleDirectoryCreateBodySchema,
  peopleDirectoryPersonIdParamsSchema,
  peopleDirectoryUpdateBodySchema,
} from "../../validation/admin-schemas.js";
import {
  createDirectoryPerson,
  deleteDirectoryPerson,
  listDirectory,
  updateDirectoryPerson,
} from "../../services/people-directory-admin-service.js";
import { sendAdminResult } from "./response.js";

export const adminPeopleDirectoryRouter = Router();

adminPeopleDirectoryRouter.use(requireAdmin);

export function createAdminPeopleDirectoryListHandler(deps: {
  listDirectory: typeof listDirectory;
}) {
  return (_req: unknown, res: { json: (body: unknown) => unknown }) => {
    const result = sendAdminResult(res as never, deps.listDirectory());
    if (result == null) return;
    res.json(result);
  };
}

function createAdminPeopleDirectoryCreateHandler(deps: {
  createDirectoryPerson: typeof createDirectoryPerson;
}) {
  return asyncHandler(async (req, res) => {
    const body = parseWithSchema(peopleDirectoryCreateBodySchema, req.body);
    const user = getAuthUser(req);
    const result = sendAdminResult(
      res,
      deps.createDirectoryPerson({
        name: body.name,
        email: body.email,
        isAdmin: body.isAdmin,
        actorUserId: user?.id,
      }),
    );
    if (result == null) return;
    res.status(201).json(result);
  });
}

function createAdminPeopleDirectoryUpdateHandler(deps: {
  updateDirectoryPerson: typeof updateDirectoryPerson;
}) {
  return asyncHandler(async (req, res) => {
    const { personId } = parseWithSchema(
      peopleDirectoryPersonIdParamsSchema,
      req.params,
    );
    const body = parseWithSchema(peopleDirectoryUpdateBodySchema, req.body);
    const user = getAuthUser(req);
    const result = sendAdminResult(
      res,
      deps.updateDirectoryPerson({
        personId,
        name: body.name,
        email: body.email,
        isAdmin: body.isAdmin,
        actorUserId: user?.id,
      }),
    );
    if (result == null) return;
    res.json(result);
  });
}

function createAdminPeopleDirectoryDeleteHandler(deps: {
  deleteDirectoryPerson: typeof deleteDirectoryPerson;
}) {
  return asyncHandler(async (req, res) => {
    const { personId } = parseWithSchema(
      peopleDirectoryPersonIdParamsSchema,
      req.params,
    );
    const user = getAuthUser(req);
    const result = sendAdminResult(
      res,
      deps.deleteDirectoryPerson({ personId, actorUserId: user?.id }),
    );
    if (result == null) return;
    res.json(result);
  });
}

adminPeopleDirectoryRouter.get("/people-directory", (_req, res) => {
  createAdminPeopleDirectoryListHandler({ listDirectory })(_req, res);
});

adminPeopleDirectoryRouter.post("/people-directory", (req, res, next) => {
  createAdminPeopleDirectoryCreateHandler({ createDirectoryPerson })(
    req,
    res,
    next,
  );
});

adminPeopleDirectoryRouter.put(
  "/people-directory/:personId",
  (req, res, next) => {
    createAdminPeopleDirectoryUpdateHandler({ updateDirectoryPerson })(
      req,
      res,
      next,
    );
  },
);

adminPeopleDirectoryRouter.delete(
  "/people-directory/:personId",
  (req, res, next) => {
    createAdminPeopleDirectoryDeleteHandler({ deleteDirectoryPerson })(
      req,
      res,
      next,
    );
  },
);
