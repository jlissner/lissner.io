import { Router } from "express";
import { getActivitySnapshot } from "../services/activity-service.js";

export const activityRouter = Router();

/** Same JSON shape as WebSocket `activity` messages (for hydration / clients without WS). */
activityRouter.get("/", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(getActivitySnapshot());
});
