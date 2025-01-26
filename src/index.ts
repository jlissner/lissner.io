import express from "express";
import session from "express-session";
import memoryStome from "memorystore";
import invariant from "tiny-invariant";
import { auth, authMiddleware, authRouter } from "./auth";
import { APP_SECRET, PORT } from "./config";
import { picturesRouter } from "./pictures";
import { documentsRouter } from "./routers";
import "./types";
import { usersRouter } from "./users";

invariant(process.env.CLIENT_ID, "Missing environt variable: CLIENT_ID");
invariant(
  process.env.CLIENT_SECRET,
  "Missing environt variable: CLIENT_SECRET",
);

const MemoryStore = memoryStome(session);
const app = express();

const ONE_DAY = 24 * 60 * 60 * 1_000;

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

app.use((req, _res, next) => {
  req.session.userToken = auth.createAuthToken("jlissner@gmail.com");

  next();
});

app.get("/", (req, res) => {
  res.send(req.session);
});

app.use(authRouter);
app.use("/documents", authMiddleware, documentsRouter);
app.use("/pictures", authMiddleware, picturesRouter);
app.use("/users", authMiddleware, usersRouter);

app.listen(PORT).on("listening", () => {
  console.log(`App started on port ${PORT}`);
});
