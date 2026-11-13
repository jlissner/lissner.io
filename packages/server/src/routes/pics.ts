import { Router } from "express";
import { VITE_PICS_UI_HOST, VITE_PICS_UI_PORT } from "../config/env.js";

export const picsRouter = Router();
const protocol = VITE_PICS_UI_HOST === "localhost" ? "http" : "https";
const picsUrl = `${protocol}://${VITE_PICS_UI_HOST}:${VITE_PICS_UI_PORT}`;

picsRouter.get("/health", async (_req, res) => {
  await fetch(picsUrl);

  res.sendStatus(200);
});
