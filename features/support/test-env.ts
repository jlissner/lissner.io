import { mkdirSync, mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function setIfMissing(name: string, value: string): void {
  if (process.env[name] == null || process.env[name] === "") {
    process.env[name] = value;
  }
}

// Ensure server-side modules that read `config/env.ts` can import in BDD runs.
setIfMissing("NODE_ENV", "test");

const dataDir = mkdtempSync(path.join(os.tmpdir(), "lissner-io-bdd-"));
mkdirSync(dataDir, { recursive: true });

setIfMissing("AWS_ACCESS_KEY_ID", "bdd-access");
setIfMissing("AWS_SECRET_ACCESS_KEY", "bdd-secret");
setIfMissing("AWS_REGION", "us-east-1");
setIfMissing("DATA_DIR", dataDir);
setIfMissing("FIRST_ADMIN_EMAIL", "admin@test.local");
setIfMissing("OLLAMA_HOST", "http://127.0.0.1:11434");
setIfMissing("BDD_STUB_EMBEDDINGS", "1");
setIfMissing("BDD_STUB_VISION", "1");
setIfMissing("BDD_FACE_DETECT_OFF", "1");
setIfMissing("BDD_FACE_MATCH_STUB", "1");
setIfMissing("OLLAMA_VISION_MODEL", "llava");
setIfMissing("S3_BUCKET", "bdd-bucket");
setIfMissing("SERVER_HOST", "localhost");
setIfMissing("SERVER_PORT", "0");
setIfMissing("SERVER_PROTOCOL", "http");
setIfMissing("SESSION_SECRET", "bdd-session-secret");
setIfMissing("SES_FROM_EMAIL", "ses@test.local");
setIfMissing("UI_PORT", "0");
