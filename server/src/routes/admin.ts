import { Router } from "express";
import { requireAuth, requireAdmin } from "../auth/middleware.js";
import { adminDataExplorerRouter } from "./admin/data-explorer-routes.js";
import { adminSqlRouter } from "./admin/sql-routes.js";
import { adminUsersRouter } from "./admin/users-routes.js";
import { adminWhitelistRouter } from "./admin/whitelist-routes.js";

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);
adminRouter.use(adminSqlRouter);
adminRouter.use(adminDataExplorerRouter);
adminRouter.use(adminWhitelistRouter);
adminRouter.use(adminUsersRouter);
