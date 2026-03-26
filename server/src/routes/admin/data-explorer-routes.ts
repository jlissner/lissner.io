import { Router } from "express";
import { parseWithSchema } from "../../validation/parse.js";
import {
  dataExplorerDeleteBodySchema,
  dataExplorerInsertBodySchema,
  dataExplorerRowsQuerySchema,
  dataExplorerSchemaQuerySchema,
  dataExplorerUpdateBodySchema,
  tableParamSchema,
} from "../../validation/admin-schemas.js";
import { ensureDataExplorerEnabled } from "./feature-gates.js";
import {
  deleteDataExplorerRow,
  getDataExplorerSchemaAndCount,
  insertDataExplorerRow,
  isDataExplorerEnabled,
  listDataExplorerRows,
  listDataExplorerTables,
  updateDataExplorerRow,
} from "../../services/admin-service.js";

export const adminDataExplorerRouter = Router();

adminDataExplorerRouter.get("/data-explorer-available", (_req, res) => {
  res.json({ available: isDataExplorerEnabled() });
});

adminDataExplorerRouter.get("/data-explorer/tables", (_req, res) => {
  if (!ensureDataExplorerEnabled(res)) return;
  try {
    res.json(listDataExplorerTables());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

adminDataExplorerRouter.get("/data-explorer/tables/:table", (req, res) => {
  if (!ensureDataExplorerEnabled(res)) return;
  try {
    const { table } = parseWithSchema(tableParamSchema, req.params);
    const { q } = parseWithSchema(dataExplorerSchemaQuerySchema, req.query);
    res.json(getDataExplorerSchemaAndCount(table, q));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

adminDataExplorerRouter.get("/data-explorer/tables/:table/rows", (req, res) => {
  if (!ensureDataExplorerEnabled(res)) return;
  try {
    const { table } = parseWithSchema(tableParamSchema, req.params);
    const { limit, offset, q } = parseWithSchema(dataExplorerRowsQuerySchema, req.query);
    res.json(listDataExplorerRows(table, limit, offset, q));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

adminDataExplorerRouter.post("/data-explorer/tables/:table", (req, res) => {
  if (!ensureDataExplorerEnabled(res)) return;
  try {
    const { table } = parseWithSchema(tableParamSchema, req.params);
    const body = parseWithSchema(dataExplorerInsertBodySchema, req.body);
    res.status(201).json({ id: insertDataExplorerRow(table, body) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

adminDataExplorerRouter.put("/data-explorer/tables/:table", (req, res) => {
  if (!ensureDataExplorerEnabled(res)) return;
  try {
    const { table } = parseWithSchema(tableParamSchema, req.params);
    const { pk, ...data } = parseWithSchema(dataExplorerUpdateBodySchema, req.body);
    res.json({ changes: updateDataExplorerRow(table, pk, data) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

adminDataExplorerRouter.delete("/data-explorer/tables/:table", (req, res) => {
  if (!ensureDataExplorerEnabled(res)) return;
  try {
    const { table } = parseWithSchema(tableParamSchema, req.params);
    const { pk } = parseWithSchema(dataExplorerDeleteBodySchema, req.body);
    res.json({ changes: deleteDataExplorerRow(table, pk) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});
