import { Router } from "express";
import * as authDb from "../../db/auth.js";
import { parseWithSchema } from "../../validation/parse.js";
import { idParamSchema, userPeopleBodySchema } from "../../validation/admin-schemas.js";

export const adminUsersRouter = Router();

adminUsersRouter.get("/users", (_req, res) => {
  res.json(authDb.getUsers());
});

adminUsersRouter.get("/users/:id/people", (req, res) => {
  const { id } = parseWithSchema(idParamSchema, req.params);
  res.json({ personIds: authDb.getUserPeople(id) });
});

adminUsersRouter.put("/users/:id/people", (req, res) => {
  const { id } = parseWithSchema(idParamSchema, req.params);
  const { personIds } = parseWithSchema(userPeopleBodySchema, req.body);
  authDb.setUserPeople(id, personIds);
  res.json({ personIds });
});
