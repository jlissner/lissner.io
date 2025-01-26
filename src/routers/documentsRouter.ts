import { Router } from "express";
import { db } from "../db";
import { s3 } from "../s3";

export const documentsRouter = Router();

documentsRouter.get("/", async (_req, res) => {
  const data = await db.select("$");

  // await db.update(data);

  // await db.insert();
  // const pictures = await s3.listFolders({
  //   Prefix: "pictures/",
  // });

  res.send(data);
});

documentsRouter.get("/folders", async (_req, res) => {
  const folders = await s3.listFolders();

  res.send(folders);
});
