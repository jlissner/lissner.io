import { Router } from "express";
import { parseWithSchema } from "../../validation/parse.js";
import { sqlBodySchema } from "../../validation/admin-schemas.js";
import { ensureSqlExplorerEnabled } from "./feature-gates.js";
import { isSqlExplorerEnabled, runSqlQuery } from "../../services/admin-service.js";

export const adminSqlRouter = Router();

adminSqlRouter.get("/sql-explorer-available", (_req, res) => {
  res.json({ available: isSqlExplorerEnabled() });
});

adminSqlRouter.post("/sql", (req, res) => {
  if (!ensureSqlExplorerEnabled(res)) return;
  const { query } = parseWithSchema(sqlBodySchema, req.body);
  try {
    res.json(runSqlQuery(query));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
