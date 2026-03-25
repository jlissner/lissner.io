import { Router } from "express";
import * as authDb from "../db/auth.js";
import * as db from "../db/media.js";
import { requireAuth, requireAdmin, getAuthUser } from "../auth/middleware.js";
import { isDataExplorerEnabled, isSqlExplorerEnabled } from "../services/admin-service.js";

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

adminRouter.get("/sql-explorer-available", (_req, res) => {
  res.json({ available: isSqlExplorerEnabled() });
});

adminRouter.post("/sql", (req, res) => {
  if (!isSqlExplorerEnabled()) {
    res
      .status(403)
      .json({ error: "SQL explorer is only available locally with SQL_EXPLORER_ENABLED=true" });
    return;
  }
  const query = req.body?.query?.trim();
  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "query (string) required" });
    return;
  }
  try {
    const result = db.runSql(query);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});

adminRouter.get("/data-explorer-available", (_req, res) => {
  res.json({ available: isDataExplorerEnabled() });
});

adminRouter.get("/data-explorer/tables", (req, res) => {
  if (!isDataExplorerEnabled()) {
    res
      .status(403)
      .json({ error: "Data explorer is only available locally with DATA_EXPLORER_ENABLED=true" });
    return;
  }
  try {
    res.json(db.getDataExplorerTables());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

adminRouter.get("/data-explorer/tables/:table", (req, res) => {
  if (!isDataExplorerEnabled()) {
    res
      .status(403)
      .json({ error: "Data explorer is only available locally with DATA_EXPLORER_ENABLED=true" });
    return;
  }
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const schema = db.getDataExplorerTableSchema(req.params.table);
    const count = db.getDataExplorerRowCount(req.params.table, q);
    res.json({ schema, count });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

adminRouter.get("/data-explorer/tables/:table/rows", (req, res) => {
  if (!isDataExplorerEnabled()) {
    res
      .status(403)
      .json({ error: "Data explorer is only available locally with DATA_EXPLORER_ENABLED=true" });
    return;
  }
  try {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 500);
    const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const rows = db.getDataExplorerRows(req.params.table, limit, offset, q);
    res.json(rows);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

adminRouter.post("/data-explorer/tables/:table", (req, res) => {
  if (!isDataExplorerEnabled()) {
    res
      .status(403)
      .json({ error: "Data explorer is only available locally with DATA_EXPLORER_ENABLED=true" });
    return;
  }
  try {
    const id = db.insertDataExplorerRow(req.params.table, req.body || {});
    res.status(201).json({ id });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

adminRouter.put("/data-explorer/tables/:table", (req, res) => {
  if (!isDataExplorerEnabled()) {
    res
      .status(403)
      .json({ error: "Data explorer is only available locally with DATA_EXPLORER_ENABLED=true" });
    return;
  }
  try {
    const { pk, ...data } = req.body || {};
    if (!pk || typeof pk !== "object") {
      res.status(400).json({ error: "pk (primary key values) required" });
      return;
    }
    const changes = db.updateDataExplorerRow(req.params.table, pk, data);
    res.json({ changes });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

adminRouter.delete("/data-explorer/tables/:table", (req, res) => {
  if (!isDataExplorerEnabled()) {
    res
      .status(403)
      .json({ error: "Data explorer is only available locally with DATA_EXPLORER_ENABLED=true" });
    return;
  }
  try {
    const pk = req.body?.pk;
    if (!pk || typeof pk !== "object") {
      res.status(400).json({ error: "pk (primary key values) required" });
      return;
    }
    const changes = db.deleteDataExplorerRow(req.params.table, pk);
    res.json({ changes });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

adminRouter.get("/whitelist", (_req, res) => {
  res.json(authDb.getWhitelist());
});

adminRouter.post("/whitelist", (req, res) => {
  const email = req.body?.email?.trim();
  const isAdmin = !!req.body?.isAdmin;
  const personIdRaw = req.body?.personId;
  const personId =
    personIdRaw != null && personIdRaw !== ""
      ? typeof personIdRaw === "number"
        ? personIdRaw
        : parseInt(String(personIdRaw), 10)
      : undefined;
  const validPersonId = personId != null && !isNaN(personId) ? personId : undefined;

  if (!email) {
    res.status(400).json({ error: "Email required" });
    return;
  }

  try {
    const user = getAuthUser(req);
    const id = authDb.addToWhitelist(email, isAdmin, user?.id, validPersonId);
    res
      .status(201)
      .json({ id, email: email.toLowerCase(), isAdmin, personId: validPersonId ?? null });
  } catch (_err) {
    res.status(400).json({ error: "Email may already be on whitelist" });
  }
});

adminRouter.delete("/whitelist/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const ok = authDb.removeFromWhitelist(id);
  if (!ok) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(204).send();
});

adminRouter.get("/users", (_req, res) => {
  res.json(authDb.getUsers());
});

adminRouter.get("/users/:id/people", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const personIds = authDb.getUserPeople(id);
  res.json({ personIds });
});

adminRouter.put("/users/:id/people", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const personIds = Array.isArray(req.body?.personIds)
    ? (req.body.personIds as number[]).filter((p: unknown) => typeof p === "number")
    : [];

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  authDb.setUserPeople(id, personIds);
  res.json({ personIds });
});
