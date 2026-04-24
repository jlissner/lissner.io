import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import {
  AWS_ACCESS_KEY_ID,
  AWS_REGION,
  AWS_SECRET_ACCESS_KEY,
  SES_FROM_EMAIL,
} from "./config/env.js";

const sesClient = new SESClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

export async function sendMagicLink(
  email: string,
  link: string,
  code: string,
): Promise<void> {
  const from = SES_FROM_EMAIL;

  await sesClient.send(
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
    }),
  );
}
