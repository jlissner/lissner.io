import { Router } from "express";
import { UAParser } from "ua-parser-js";
import { s3 } from "../aws/s3";
import { loginEmailTemplate } from "../emailTemplates";
import { generateLoginCode } from "../utils/generateLoginCode";

export const documentsRouter = Router();

documentsRouter.get("/", async (req, res) => {
  const ua = UAParser(req.headers["user-agent"]);
  // const data = await db.select("$");
  // const data = await ses.sendEmail(
  //   ["jlissner@gmail.com"],
  //   "Hello",
  //   "<b>world</b>",
  // );

  // await db.update(data);

  // await db.insert();
  // const pictures = await s3.listFolders({
  //   Prefix: "pictures/",
  // });

  res.send(
    loginEmailTemplate({
      code: generateLoginCode(),
      browser: ua.browser.name,
      os: ua.os.name,
    }),
  );
});

documentsRouter.get("/folders", async (_req, res) => {
  const folders = await s3.listFolders();

  res.send(folders);
});
