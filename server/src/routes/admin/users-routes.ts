import { Router } from "express";
import { parseWithSchema } from "../../validation/parse.js";
import { idParamSchema, userPeopleBodySchema } from "../../validation/admin-schemas.js";
import { getUserPeople, listUsers, setUserPeople } from "../../services/admin-service.js";

export const adminUsersRouter = Router();

adminUsersRouter.get("/users", (_req, res) => {
  res.json(listUsers());
});

adminUsersRouter.get("/users/:id/people", (req, res) => {
  const { id } = parseWithSchema(idParamSchema, req.params);
  res.json({ personIds: getUserPeople(id) });
});

adminUsersRouter.put("/users/:id/people", (req, res) => {
  const { id } = parseWithSchema(idParamSchema, req.params);
  const { personIds } = parseWithSchema(userPeopleBodySchema, req.body);
  res.json({ personIds: setUserPeople(id, personIds) });
});
