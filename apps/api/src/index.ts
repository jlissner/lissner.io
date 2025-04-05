import cors from "cors";
import express from "express";
import session from "express-session";
import memoryStome from "memorystore";
import { authMiddleware, authRouter } from "./auth";
import { APP_PORT, APP_SECRET, APP_URL } from "./config";
import { picturesRouter } from "./pictures";
import { documentsRouter, usersRouter } from "./routers";
import "./types";
import { usersRouter as existingUsersRouter } from "./users";
import { authorizationErrorHandler, zodErrorHandler } from "./utils";
import { filesRouter } from "./routers/filesRouter";

const MemoryStore = memoryStome(session);
const app = express();

const ONE_DAY = 24 * 60 * 60 * 1_000;

app.use(
  cors({
    credentials: true,
    origin: APP_URL, // Replace with your React app's origin
  }),
);

app.use(
  session({
    cookie: {
      maxAge: ONE_DAY,
    },
    resave: false,
    saveUninitialized: false,
    secret: APP_SECRET,
    store: new MemoryStore({
      checkPeriod: ONE_DAY, // prune expired entries every 24h
    }),
  }),
);

app.use(express.json());

app.use(authRouter);
app.use("/documents", authMiddleware, documentsRouter);
app.use("/pictures", authMiddleware, picturesRouter);
app.use("/users", authMiddleware, existingUsersRouter);
app.use("/dynamodb/users", authMiddleware, usersRouter);
app.use("/files", authMiddleware, filesRouter);

app.use(zodErrorHandler);
app.use(authorizationErrorHandler);

app.listen(APP_PORT).on("listening", () => {
  console.log(`App started on port ${APP_PORT}`);
});
