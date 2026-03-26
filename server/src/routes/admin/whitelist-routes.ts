import { Router } from "express";
import { getAuthUser } from "../../auth/middleware.js";
import { parseWithSchema } from "../../validation/parse.js";
import { idParamSchema, whitelistCreateBodySchema } from "../../validation/admin-schemas.js";
import {
  addWhitelistEntry,
  listWhitelistEntries,
  removeWhitelistEntry,
} from "../../services/admin-service.js";

export const adminWhitelistRouter = Router();

adminWhitelistRouter.get("/whitelist", (_req, res) => {
  res.json(listWhitelistEntries());
});

adminWhitelistRouter.post("/whitelist", (req, res) => {
  const { email, isAdmin, personId } = parseWithSchema(whitelistCreateBodySchema, req.body);
  try {
    const user = getAuthUser(req);
    const id = addWhitelistEntry({
      email,
      isAdmin,
      personId,
      actorUserId: user?.id,
    });
    res.status(201).json({ id, email: email.toLowerCase(), isAdmin, personId: personId ?? null });
  } catch {
    res.status(400).json({ error: "Email may already be on whitelist" });
  }
});

adminWhitelistRouter.delete("/whitelist/:id", (req, res) => {
  const { id } = parseWithSchema(idParamSchema, req.params);
  const ok = removeWhitelistEntry(id);
  if (!ok) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(204).send();
});
