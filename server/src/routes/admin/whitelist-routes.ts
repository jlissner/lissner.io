import { Router } from "express";
import { sendApiError } from "../../lib/api-error.js";
import { getAuthUser } from "../../auth/middleware.js";
import { parseWithSchema } from "../../validation/parse.js";
import {
  idParamSchema,
  whitelistCreateBodySchema,
} from "../../validation/admin-schemas.js";
import {
  addWhitelistEntry,
  listWhitelistEntries,
  removeWhitelistEntry,
} from "../../services/admin-service.js";
import { sendAdminResult } from "./response.js";

export const adminWhitelistRouter = Router();

adminWhitelistRouter.get("/whitelist", (_req, res) => {
  const result = sendAdminResult(res, listWhitelistEntries());
  if (result == null) return;
  res.json(result);
});

adminWhitelistRouter.post("/whitelist", (req, res) => {
  const { email, isAdmin, personId } = parseWithSchema(
    whitelistCreateBodySchema,
    req.body,
  );
  const user = getAuthUser(req);
  const result = sendAdminResult(
    res,
    addWhitelistEntry({
      email,
      isAdmin,
      personId,
      actorUserId: user?.id,
    }),
  );
  if (result == null) return;
  res.status(201).json({
    id: result,
    email: email.toLowerCase(),
    isAdmin,
    personId: personId ?? null,
  });
});

adminWhitelistRouter.delete("/whitelist/:id", (req, res) => {
  const { id } = parseWithSchema(idParamSchema, req.params);
  const ok = removeWhitelistEntry(id);
  if (!ok) {
    sendApiError(res, 404, "Not found", "admin_not_found");
    return;
  }
  res.status(204).send();
});
