import { Router } from "express";
import { s3 } from "../s3";

export const picturesRouter = Router();

picturesRouter.get("/", async (_req, res) => {
  const pictures = await s3.listFiles({
    Prefix: "pictures/japan-2014",
  });

  res.send(pictures);
});

picturesRouter.get("/:pictureKey", async (req, res) => {
  // const { pictureKey } = req.params;

  try {
    const picture = await s3.getPictureUrl({
      Key: "pictures/japan-2014/DSCN0412.JPG",
    });

    console.log(picture);

    res.send(picture);
  } catch {
    res.status(404).send();
  }
});
