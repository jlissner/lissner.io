import invariant from "tiny-invariant";

invariant(process.env.APP_SECRET, 'Missing environment variable APP_SECRET');
invariant(process.env.APP_URL, 'Missing environment variable APP_URL');
invariant(process.env.APP_PORT, 'Missing environment variable APP_PORT');

export const APP_PORT = Number(process.env.APP_PORT);
export const APP_SECRET = process.env.APP_SECRET;
export const APP_URL = process.env.APP_URL;

export const NOT_AUTHORIZED = 'Not Authorized';

