/**
 * Truncate media_test tables between Vitest cases.
 * Only safe when MEDIA_DATABASE_NAME is media_test (enforced).
 */
import { MEDIA_DATABASE_NAME } from "../config/env.js";
import { execScript } from "./client.js";

const TRUNCATE_SQL = `
  TRUNCATE TABLE
    refresh_tokens,
    magic_link_tokens,
    user_people,
    users,
    auth_whitelist,
    media_tags,
    image_people,
    embeddings,
    media,
    person_names
  RESTART IDENTITY CASCADE
`;

export const resetMediaTestDb = async (): Promise<void> => {
  if (MEDIA_DATABASE_NAME !== "media_test") {
    throw new Error(
      `resetMediaTestDb refused: MEDIA_DATABASE_NAME=${MEDIA_DATABASE_NAME} (expected media_test)`,
    );
  }
  await execScript(TRUNCATE_SQL);
};
