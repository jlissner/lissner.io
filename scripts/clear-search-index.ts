import { SERVER_PORT, API_HOST } from "../server/src/config/env.js";

const base = `http://${API_HOST}:${SERVER_PORT}`.replace(/\/$/, "");

const res = await fetch(`${base}/api/search/index/clear`, { method: "POST" });
const text = await res.text();

if (!res.ok) {
  console.error(res.status, text);
  process.exit(1);
}

if (text) {
  console.log(text);
}
