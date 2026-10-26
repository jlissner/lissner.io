import {
  DATABASE_URL,
  GRAPHQL_PORT,
  IS_PRODUCTION,
  PG_JWT_SECRET,
  PG_SCHEMAS,
} from "./src/env.js";
import { pgSettingsFromRequest } from "./src/pg-settings-from-jwt.js";
import { makePgService } from "postgraphile/adaptors/pg";
import { PgJWTPlugin } from "postgraphile/graphile-build-pg";
import { makeV4Preset } from "postgraphile/presets/v4";
import type { GraphileConfig } from "graphile-config";
import type { IncomingMessage } from "node:http";
import invariant from "tiny-invariant";

invariant(PG_JWT_SECRET, "PG_JWT_SECRET or SESSION_SECRET must be set");

/** Matches former `--jwt-token-identifier app.jwt_token`. */
const PG_JWT_TYPE = "app.jwt_token";

/** Matches former `--default-role unauthorized`. */
const PG_DEFAULT_ROLE = "unauthorized";

const preset: GraphileConfig.Preset = {
  extends: [
    makeV4Preset({
      watchPg: !IS_PRODUCTION,
      jwtPgTypeIdentifier: PG_JWT_TYPE,
      jwtSecret: PG_JWT_SECRET,
      subscriptions: true,
      retryOnInitFail: true,
      dynamicJson: true,
      setofFunctionsContainNulls: false,
      ignoreRBAC: false,
      extendedErrors: ["errcode"],
      graphiql: false,
    }),
  ],
  plugins: [PgJWTPlugin],
  pgServices: [
    makePgService({
      connectionString: DATABASE_URL,
      schemas: PG_SCHEMAS,
      pubsub: true,
    }),
  ],
  grafast: {
    async context(requestContext, args) {
      const req = requestContext.node?.req as IncomingMessage | undefined;
      const pgSettings = await pgSettingsFromRequest(
        req,
        PG_JWT_SECRET,
        PG_DEFAULT_ROLE,
      );
      return {
        ...args.contextValue,
        pgSettings,
      };
    },
  },
  grafserv: {
    port: GRAPHQL_PORT,
    host: "0.0.0.0",
  },
};

export default preset;
