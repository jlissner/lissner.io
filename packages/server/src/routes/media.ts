import { Router } from "express";
import { mediaFacesRouter } from "./media/faces-routes.js";
import { mediaReadRouter } from "./media/read-routes.js";
import { mediaWriteRouter } from "./media/write-routes.js";

export const mediaRouter = Router();
mediaRouter.use(mediaWriteRouter);
mediaRouter.use(mediaFacesRouter);
mediaRouter.use(mediaReadRouter);
