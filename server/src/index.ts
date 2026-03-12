// Node 23+ removed util.isNullOrUndefined; tfjs-node still uses it
import util from "util";
if (typeof (util as any).isNullOrUndefined !== "function") {
  (util as any).isNullOrUndefined = (v: unknown) => v === null || v === undefined;
}

import cors from "cors";
import express from "express";
import { mkdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { mediaRouter } from "./routes/media.js";
import { peopleRouter } from "./routes/people.js";
import { searchRouter } from "./routes/search.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../../../data");
const uiDistDir = path.join(__dirname, "../../../ui/dist");
mkdirSync(path.join(dataDir, "media"), { recursive: true });
mkdirSync(path.join(dataDir, "db"), { recursive: true });

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/media", mediaRouter);
app.use("/api/people", peopleRouter);
app.use("/api/search", searchRouter);

if (existsSync(uiDistDir)) {
  app.use(express.static(uiDistDir));
  app.get("*", (_req, res) => res.sendFile(path.join(uiDistDir, "index.html")));
} else {
  app.get("/", (_req, res) => res.send("Hello world"));
}

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
