import { Router } from "express";
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

adminDataExplorerRouter.get("/data-explorer/tables", async (_req, res) => {
  if (!ensureDataExplorerEnabled(res)) return;
  const result = sendAdminResult(res, await listDataExplorerTables());
  if (result == null) return;
  res.json(result);
});

adminDataExplorerRouter.get(
  "/data-explorer/tables/:table",
  async (req, res) => {
    if (!ensureDataExplorerEnabled(res)) return;
    const { table } = tableParamSchema.parse(req.params);
    const { q } = dataExplorerSchemaQuerySchema.parse(req.query);
    const result = sendAdminResult(
      res,
      await getDataExplorerSchemaAndCount(table, q),
    );
    if (result == null) return;
    res.json(result);
  },
);

adminDataExplorerRouter.get(
  "/data-explorer/tables/:table/rows",
  async (req, res) => {
    if (!ensureDataExplorerEnabled(res)) return;
    const { table } = tableParamSchema.parse(req.params);
    const { limit, offset, q } = dataExplorerRowsQuerySchema.parse(req.query);
    const result = sendAdminResult(
      res,
      await listDataExplorerRows(table, limit, offset, q),
    );
    if (result == null) return;
    res.json(result);
  },
);

adminDataExplorerRouter.post(
  "/data-explorer/tables/:table",
  async (req, res) => {
    if (!ensureDataExplorerEnabled(res)) return;
    const { table } = tableParamSchema.parse(req.params);
    const body = dataExplorerInsertBodySchema.parse(req.body);
    const result = sendAdminResult(
      res,
      await insertDataExplorerRow(table, body),
    );
    if (result == null) return;
    res.status(201).json({ id: result });
  },
);

adminDataExplorerRouter.put(
  "/data-explorer/tables/:table",
  async (req, res) => {
    if (!ensureDataExplorerEnabled(res)) return;
    const { table } = tableParamSchema.parse(req.params);
    const { pk, ...data } = dataExplorerUpdateBodySchema.parse(req.body);
    const result = sendAdminResult(
      res,
      await updateDataExplorerRow(table, pk, data),
    );
    if (result == null) return;
    res.json({ changes: result });
  },
);

adminDataExplorerRouter.delete(
  "/data-explorer/tables/:table",
  async (req, res) => {
    if (!ensureDataExplorerEnabled(res)) return;
    const { table } = tableParamSchema.parse(req.params);
    const { pk } = dataExplorerDeleteBodySchema.parse(req.body);
    const result = sendAdminResult(res, await deleteDataExplorerRow(table, pk));
    if (result == null) return;
    res.json({ changes: result });
  },
);
