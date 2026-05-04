import { Router } from "express";
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

  res.json(result);
});

adminUsersRouter.get("/users/:id/people", (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const result = sendAdminResult(res, getUserPeople(id));

  res.json({ personIds: result });
});

adminUsersRouter.put("/users/:id/people", (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { personIds } = userPeopleBodySchema.parse(req.body);
  const result = sendAdminResult(res, setUserPeople(id, personIds));

  res.json({ personIds: result });
});
