import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { logger } from "./logger.js";

const sesVars = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"] as const;

function isSESConfigured(): boolean {
  return sesVars.every((v) => process.env[v]?.trim());
}

const sesHolder = { client: null as SESClient | null };

function getSESClient(): SESClient | null {
  if (!isSESConfigured()) return null;
  if (!sesHolder.client) {
    sesHolder.client = new SESClient({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return sesHolder.client;
}

export function isEmailConfigured(): boolean {
  return isSESConfigured() && !!process.env.SES_FROM_EMAIL?.trim();
}

export async function sendMagicLink(
  email: string,
  link: string,
  code: string
): Promise<void> {
  const ses = getSESClient();
  const from = process.env.SES_FROM_EMAIL?.trim();

  if (!ses || !from) {
    logger.warn({ email, link, code }, "SES not configured; magic link emitted to logs");
    return;
  }

  await ses.send(
    new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: "Your login code for Family Media Manager" },
        Body: {
          Text: {
            Data: `Your login code is: ${code}\n\nOr click the link below to sign in:\n\n${link}\n\nThis code and link expire in 15 minutes.`,
          },
          Html: {
            Data: `<p style="font-size:24px;font-weight:bold;letter-spacing:4px;text-align:center;margin:16px 0">${code}</p><p>Enter this code on the login page, or click the link below to sign in:</p><p><a href="${link}">${link}</a></p><p>This code and link expire in 15 minutes.</p>`,
          },
        },
      },
    })
  );
}
