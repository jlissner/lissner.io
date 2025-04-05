import jwt from "jsonwebtoken";
import { APP_SECRET } from "../config";

function createAuthToken(userId: string): string {
  const signedToken = jwt.sign(
    {
      aud: "https://lissner.io",
      issuer: "https://lissner.io",
      sub: userId,
    },
    APP_SECRET,
    {
      expiresIn: "24h", // one day
    }
  );

  return signedToken;
}

export const auth = {
  createAuthToken,
};
