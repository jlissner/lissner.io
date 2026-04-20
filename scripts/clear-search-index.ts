import "../server/src/config/env.js";

const port = process.env.SERVER_PORT;
const base = (
  process.env.API_PROXY_TARGET?.trim() ||
  `http://${process.env.SERVER_HOST?.trim() || "127.0.0.1"}:${port}`
).replace(/\/$/, "");

const res = await fetch(`${base}/api/search/index/clear`, { method: "POST" });
const text = await res.text();
if (!res.ok) {
  console.error(res.status, text);
  process.exit(1);
}
if (text) {
  console.log(text);
}
