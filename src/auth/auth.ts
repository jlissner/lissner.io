import jwt from 'jsonwebtoken';
import { APP_SECRET } from '../config';

function createAuthToken(email: string): string {
  const signedToken = jwt.sign({
    expiresIn: 60 * 24, // one day
    aud: "https://lissner.io",
    issuer: "https://lissner.io",
    sub: email,
  }, APP_SECRET);

  return signedToken;
}

export const auth = {
  createAuthToken,
}
