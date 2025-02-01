import cors from "cors";
import express from "express";
import session from "express-session";
import memoryStome from "memorystore";
import { authMiddleware, authRouter } from "./auth";
import { APP_PORT, APP_SECRET } from "./config";
import { picturesRouter } from "./pictures";
import { documentsRouter } from "./routers";
import "./types";
import { usersRouter } from "./users";
import { authorizationErrorHandler, zodErrorHandler } from "./utils";

const MemoryStore = memoryStome(session);
const app = express();

const ONE_DAY = 24 * 60 * 60 * 1_000;

app.use(cors());

app.use(
  session({
    cookie: { maxAge: ONE_DAY },
    store: new MemoryStore({
      checkPeriod: ONE_DAY, // prune expired entries every 24h
    }),
    resave: false,
    secret: APP_SECRET,
    saveUninitialized: false,
  }),
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send(req.session);
});

app.use(authRouter);
app.use("/documents", authMiddleware, documentsRouter);
app.use("/pictures", authMiddleware, picturesRouter);
app.use("/users", authMiddleware, usersRouter);

app.use(zodErrorHandler);
app.use(authorizationErrorHandler);

app.listen(APP_PORT).on("listening", () => {
  console.log(`App started on port ${APP_PORT}`);
});
