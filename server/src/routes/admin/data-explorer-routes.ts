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
import { sendAdminResult } from "./response.js";

export const adminDataExplorerRouter = Router();

adminDataExplorerRouter.get("/data-explorer-available", (_req, res) => {
  res.json({ available: isDataExplorerEnabled() });
});

adminDataExplorerRouter.get("/data-explorer/tables", (_req, res) => {
  if (!ensureDataExplorerEnabled(res)) return;
  const result = sendAdminResult(res, listDataExplorerTables());
  if (result == null) return;
  res.json(result);
});

adminDataExplorerRouter.get("/data-explorer/tables/:table", (req, res) => {
  if (!ensureDataExplorerEnabled(res)) return;
  const { table } = parseWithSchema(tableParamSchema, req.params);
  const { q } = parseWithSchema(dataExplorerSchemaQuerySchema, req.query);
  const result = sendAdminResult(res, getDataExplorerSchemaAndCount(table, q));
  if (result == null) return;
  res.json(result);
});

adminDataExplorerRouter.get("/data-explorer/tables/:table/rows", (req, res) => {
  if (!ensureDataExplorerEnabled(res)) return;
  const { table } = parseWithSchema(tableParamSchema, req.params);
  const { limit, offset, q } = parseWithSchema(dataExplorerRowsQuerySchema, req.query);
  const result = sendAdminResult(res, listDataExplorerRows(table, limit, offset, q));
  if (result == null) return;
  res.json(result);
});

adminDataExplorerRouter.post("/data-explorer/tables/:table", (req, res) => {
  if (!ensureDataExplorerEnabled(res)) return;
  const { table } = parseWithSchema(tableParamSchema, req.params);
  const body = parseWithSchema(dataExplorerInsertBodySchema, req.body);
  const result = sendAdminResult(res, insertDataExplorerRow(table, body));
  if (result == null) return;
  res.status(201).json({ id: result });
});

adminDataExplorerRouter.put("/data-explorer/tables/:table", (req, res) => {
  if (!ensureDataExplorerEnabled(res)) return;
  const { table } = parseWithSchema(tableParamSchema, req.params);
  const { pk, ...data } = parseWithSchema(dataExplorerUpdateBodySchema, req.body);
  const result = sendAdminResult(res, updateDataExplorerRow(table, pk, data));
  if (result == null) return;
  res.json({ changes: result });
});

adminDataExplorerRouter.delete("/data-explorer/tables/:table", (req, res) => {
  if (!ensureDataExplorerEnabled(res)) return;
  const { table } = parseWithSchema(tableParamSchema, req.params);
  const { pk } = parseWithSchema(dataExplorerDeleteBodySchema, req.body);
  const result = sendAdminResult(res, deleteDataExplorerRow(table, pk));
  if (result == null) return;
  res.json({ changes: result });
});
