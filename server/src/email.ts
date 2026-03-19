import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesVars = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"] as const;

function isSESConfigured(): boolean {
  return sesVars.every((v) => process.env[v]?.trim());
}

let client: SESClient | null = null;

function getSESClient(): SESClient | null {
  if (!isSESConfigured()) return null;
  if (!client) {
    client = new SESClient({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

export function isEmailConfigured(): boolean {
  return isSESConfigured() && !!process.env.SES_FROM_EMAIL?.trim();
}

export async function sendMagicLink(email: string, link: string): Promise<void> {
  const ses = getSESClient();
  const from = process.env.SES_FROM_EMAIL?.trim();

  if (!ses || !from) {
    console.log(`\n📧 Magic link for ${email}:\n   ${link}\n`);
    return;
  }

  await ses.send(
    new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: "Your login link for Family Media Manager" },
        Body: {
          Text: {
            Data: `Click the link below to sign in:\n\n${link}\n\nThis link expires in 15 minutes.`,
          },
          Html: {
            Data: `<p>Click the link below to sign in:</p><p><a href="${link}">${link}</a></p><p>This link expires in 15 minutes.</p>`,
          },
        },
      },
    })
  );
}
