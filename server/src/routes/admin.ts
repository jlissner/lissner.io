import { Router } from "express";
import * as authDb from "../db/auth.js";
import * as db from "../db/media.js";
import { requireAuth, requireAdmin, getAuthUser } from "../auth/middleware.js";
import { isDataExplorerEnabled, isSqlExplorerEnabled } from "../services/admin-service.js";
import { parseWithSchema } from "../validation/parse.js";
import {
  dataExplorerDeleteBodySchema,
  dataExplorerInsertBodySchema,
  dataExplorerRowsQuerySchema,
  dataExplorerSchemaQuerySchema,
  dataExplorerUpdateBodySchema,
  idParamSchema,
  sqlBodySchema,
  tableParamSchema,
  userPeopleBodySchema,
  whitelistCreateBodySchema,
} from "../validation/admin-schemas.js";

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
  const { query } = parseWithSchema(sqlBodySchema, req.body);
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
    const { table } = parseWithSchema(tableParamSchema, req.params);
    const { q } = parseWithSchema(dataExplorerSchemaQuerySchema, req.query);
    const schema = db.getDataExplorerTableSchema(table);
    const count = db.getDataExplorerRowCount(table, q);
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
    const { table } = parseWithSchema(tableParamSchema, req.params);
    const { limit, offset, q } = parseWithSchema(dataExplorerRowsQuerySchema, req.query);
    const rows = db.getDataExplorerRows(table, limit, offset, q);
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
    const { table } = parseWithSchema(tableParamSchema, req.params);
    const body = parseWithSchema(dataExplorerInsertBodySchema, req.body);
    const id = db.insertDataExplorerRow(table, body);
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
    const { table } = parseWithSchema(tableParamSchema, req.params);
    const { pk, ...data } = parseWithSchema(dataExplorerUpdateBodySchema, req.body);
    const changes = db.updateDataExplorerRow(table, pk, data);
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
    const { table } = parseWithSchema(tableParamSchema, req.params);
    const { pk } = parseWithSchema(dataExplorerDeleteBodySchema, req.body);
    const changes = db.deleteDataExplorerRow(table, pk);
    res.json({ changes });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

adminRouter.get("/whitelist", (_req, res) => {
  res.json(authDb.getWhitelist());
});

adminRouter.post("/whitelist", (req, res) => {
  const { email, isAdmin, personId } = parseWithSchema(whitelistCreateBodySchema, req.body);

  try {
    const user = getAuthUser(req);
    const id = authDb.addToWhitelist(email, isAdmin, user?.id, personId);
    res
      .status(201)
      .json({ id, email: email.toLowerCase(), isAdmin, personId: personId ?? null });
  } catch (_err) {
    res.status(400).json({ error: "Email may already be on whitelist" });
  }
});

adminRouter.delete("/whitelist/:id", (req, res) => {
  const { id } = parseWithSchema(idParamSchema, req.params);

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
  const { id } = parseWithSchema(idParamSchema, req.params);

  const personIds = authDb.getUserPeople(id);
  res.json({ personIds });
});

adminRouter.put("/users/:id/people", (req, res) => {
  const { id } = parseWithSchema(idParamSchema, req.params);
  const { personIds } = parseWithSchema(userPeopleBodySchema, req.body);

  authDb.setUserPeople(id, personIds);
  res.json({ personIds });
});
