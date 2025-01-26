import crypto from "crypto";
import { google } from "googleapis";
import { Router } from "express";
import url from "url";
import { GOOGLE_APP } from "../config";
import invariant from "tiny-invariant";

export const authRouter = Router();

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_APP.id,
  GOOGLE_APP.secret,
  "http://localhost:3000/login/google/callback",
);

authRouter.get("/login/google", (req, res) => {
  const state = crypto.randomBytes(32).toString("hex");
  const authorizationUrl = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: "offline",
    /** Pass in the scopes array defined above.
     * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
    scope: ["openid", "email"],
    // Enable incremental authorization. Recommended as a best practice.
    include_granted_scopes: true,
    // Include the state parameter to reduce the risk of CSRF attacks.
    state: state,
  });

  req.session.state = state;

  res.redirect(authorizationUrl);
});

authRouter.get("/login/google/callback", async (req, res) => {
  const { query } = url.parse(req.url, true);

  if (query.error) { // An error response e.g. error=access_denied
    console.log("Error:" + query.error);

    res.end("Error loggin in");
  } else if (query.state !== req.session.state) { //check state value
    console.log("State mismatch. Possible CSRF attack");

    res.end("State mismatch. Possible CSRF attack");
  } else {
    invariant(typeof query.code === 'string', 'No valid code provided');
    // Get access and refresh tokens (if access_type is offline)

    const { tokens } = await oauth2Client.getToken(query.code);

    oauth2Client.setCredentials(tokens);

    console.log(tokens);
  }

  res.redirect('/');
});

authRouter.post("/logout", (_req, res) => {
  res.send("logging in");
});
