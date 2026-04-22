import { Router } from "express";
import { parseWithSchema } from "../../validation/parse.js";
import {
  idParamSchema,
  userPeopleBodySchema,
} from "../../validation/admin-schemas.js";
import {
  getUserPeople,
  listUsers,
  setUserPeople,
} from "../../services/admin-service.js";
import { sendAdminResult } from "./response.js";

export const adminUsersRouter = Router();

adminUsersRouter.get("/users", (_req, res) => {
  const result = sendAdminResult(res, listUsers());
  if (result == null) return;
  res.json(result);
});

adminUsersRouter.get("/users/:id/people", (req, res) => {
  const { id } = parseWithSchema(idParamSchema, req.params);
  const result = sendAdminResult(res, getUserPeople(id));
  if (result == null) return;
  res.json({ personIds: result });
});

adminUsersRouter.put("/users/:id/people", (req, res) => {
  const { id } = parseWithSchema(idParamSchema, req.params);
  const { personIds } = parseWithSchema(userPeopleBodySchema, req.body);
  const result = sendAdminResult(res, setUserPeople(id, personIds));
  if (result == null) return;
  res.json({ personIds: result });
});
