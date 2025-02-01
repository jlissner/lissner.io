import {
  SendEmailCommand,
  SESClient,
} from "@aws-sdk/client-ses";

// a client can be shared by different commands.
const client = new SESClient({ region: "us-west-2" });

async function sendEmail(to: string[], subject: string, body: string) {
  const sendEmailCommand = new SendEmailCommand({
    Destination: { ToAddresses: to },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: body } },
    },
    Source: "no-reply@lissner.io",
  });
  const data = await client.send(sendEmailCommand);

  return data;
}

export const ses = {
  sendEmail,
};
