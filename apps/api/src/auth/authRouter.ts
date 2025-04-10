import { Router } from "express";
import invariant from "tiny-invariant";
import { UAParser } from "ua-parser-js";
import { ses } from "../aws/ses";
import { loginEmailTemplate } from "../emailTemplates";
import { dynamodb } from "../aws/dynamodb";
import { generateLoginCode } from "../utils/generateLoginCode";
import { auth } from "./auth";
import { authMiddleware } from "./authMiddleware";
import type { User } from "@lissner/types";

interface PostLoginBody {
  email: string;
}

export const authRouter = Router();

authRouter.get("/me", authMiddleware, async (req, res) => {
  const { user } = req.session;

  invariant(user);
  invariant(user.sub);

  const foundUser = await dynamodb.getUserByEmail(user.sub);

  res.send(foundUser);
});

authRouter.post<unknown, unknown, PostLoginBody>("/login", async (req, res) => {
  const { email } = req.body;
  invariant(email);

  const user = await dynamodb.getUserByEmail(email);

  if (user) {
    const code = generateLoginCode();
    console.log({ code });
    const ua = UAParser(req.headers["user-agent"]);

    req.session.loginCode = code;
    req.session.loginEmail = email;

    await ses.sendEmail(
      [email],
      "Login Request from lissner.io",
      loginEmailTemplate({
        code,
        browser: ua.browser.name,
        os: ua.os.name,
      }),
    );
  }

  res.status(204).send();
});

authRouter.post("/login/:code", async (req, res) => {
  const code = req.session.loginCode;
  const email = req.session.loginEmail;
  const givenCode = Number(req.params.code);

  req.session.loginCode = undefined;
  req.session.loginEmail = undefined;

  if (code !== givenCode) {
    res.status(401).send();
    return;
  }

  invariant(email);

  const user = await dynamodb.getUserByEmail(email);

  if (!user) {
    res.status(401).send();
    return;
  }

  invariant(user.id);

  const token = auth.createAuthToken(user.id);

  res.send(token);
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).send(err);
      return;
    }

    res.status(204).send();
  });
});
