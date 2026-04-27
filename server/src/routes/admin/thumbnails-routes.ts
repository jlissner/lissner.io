import { Router, type RequestHandler } from "express";
import { repairMissingThumbnails } from "../../services/media-read-service.js";
import { parseWithSchema } from "../../validation/parse.js";
import { adminThumbnailsRepairBodySchema } from "../../validation/admin-thumbnails-schemas.js";

export const adminThumbnailsRouter = Router();

export function createAdminThumbnailsRepairHandler(deps?: {
  repairMissingThumbnails?: typeof repairMissingThumbnails;
}): RequestHandler {
  const repair = deps?.repairMissingThumbnails ?? repairMissingThumbnails;

  return async (req, res) => {
    const { maxGenerations } = parseWithSchema(
      adminThumbnailsRepairBodySchema,
      req.body ?? {},
    );
    const result = await repair({ maxGenerations });
    res.json(result);
  };
}

adminThumbnailsRouter.post(
  "/thumbnails/repair",
  createAdminThumbnailsRepairHandler(),
);
