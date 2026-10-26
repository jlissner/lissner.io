import { GRAPHQL_HOST, GRAPHQL_PORT } from "./env.js";
import { handleCors } from "./apply-cors.js";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { postgraphile } from "postgraphile";
import { grafserv } from "postgraphile/grafserv/node";
import preset from "../graphile.config.js";

const requestPath = (req: IncomingMessage): string =>
  req.url?.split("?")[0] ?? "";

const aliasRootPostToGraphql = (req: IncomingMessage): void => {
  if (req.method !== "POST" || requestPath(req) !== "/") {
    return;
  }

  const url = req.url ?? "";
  const queryStart = url.indexOf("?");
  const querySuffix = queryStart >= 0 ? url.slice(queryStart) : "";
  req.url = `/graphql${querySuffix}`;
};

const isHealthRequest = (req: IncomingMessage): boolean =>
  req.method === "GET" && requestPath(req) === "/health";

const writeHealth = (res: ServerResponse): void => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ok");
};

const pgl = postgraphile(preset);
const serv = pgl.createServ(grafserv);
const graphqlHandler = serv.createHandler();
const server = createServer(async (req, res) => {
  if (isHealthRequest(req)) {
    writeHealth(res);
    return;
  }

  if (handleCors(req, res)) {
    return;
  }

  aliasRootPostToGraphql(req);
  await graphqlHandler(req, res);
});

server.on("error", (err) => {
  console.error(err);
  process.exit(1);
});

const upgradeHandler = await serv.getUpgradeHandler();
if (upgradeHandler) {
  server.on("upgrade", (req, socket, head) => {
    if (serv.shouldHandleUpgrade(req, socket, head)) {
      upgradeHandler(req, socket, head);
      return;
    }

    socket.destroy();
  });
}

server.listen(GRAPHQL_PORT, "0.0.0.0", () => {
  console.info(
    { host: GRAPHQL_HOST, port: GRAPHQL_PORT },
    "GraphQL server listening",
  );
});
