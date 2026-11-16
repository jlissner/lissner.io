import { Router } from "express";
import { VITE_PICS_UI_HOST, VITE_PICS_UI_PORT } from "../config/env.js";

export const picsRouter = Router();
const isProd = process.env.NODE_ENV === "production";
const picsUrl = isProd
  ? `https://${VITE_PICS_UI_HOST}`
  : `http://${VITE_PICS_UI_HOST}:${VITE_PICS_UI_PORT}`;

picsRouter.get("/health", async (_req, res) => {
  const pics = await fetch(`${picsUrl}/health`);

  res.sendStatus(pics.status);
});
