import { Router } from "express";
import { requireAdmin } from "../auth/middleware.js";
import { adminDataExplorerRouter } from "./admin/data-explorer-routes.js";
import { adminDuplicatesRouter } from "./admin/duplicates-routes.js";
import { adminSqlRouter } from "./admin/sql-routes.js";
import { adminUsersRouter } from "./admin/users-routes.js";
import { adminWhitelistRouter } from "./admin/whitelist-routes.js";
import { adminDbBackupRouter } from "./admin/db-backup-routes.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);
adminRouter.use(adminDuplicatesRouter);
adminRouter.use(adminSqlRouter);
adminRouter.use(adminDataExplorerRouter);
adminRouter.use(adminWhitelistRouter);
adminRouter.use(adminUsersRouter);
adminRouter.use(adminDbBackupRouter);
