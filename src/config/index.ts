import invariant from "tiny-invariant";

export const PORT = 3000;

export const GOOGLE_APP = {
  id: process.env.CLIENT_ID,
  secret: process.env.CLIENT_SECRET,
};

invariant(process.env.APP_SECRET, 'Missing environment variable APP_SECRET');
export const APP_SECRET = process.env.APP_SECRET;

