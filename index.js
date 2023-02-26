const express = require("express");
const { google } = require("googleapis");
const { OAuth2 } = google.auth;
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

const oAuth2Client = new OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);
oAuth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
// let timestamp = new Date().getTime()-10000;

const checkForNewMessages = () => {
  gmail.users.messages.list(
    {
      userId: "me",
      q: `is:unread`,
    },
    async (err, res) => {
      if (err) return console.log("The API returned an error: " + err);

      const messages = res.data.messages;

      if (messages?.length) {
        console.log("New message received!");

        for (const message of messages) {
          const messageDetails = await gmail.users.messages.get({
            userId: "me",
            id: message.id,
          });
          const threadId = messageDetails.data.threadId;
          const threadDetails = await gmail.users.threads.get({
            userId: "me",
            id: threadId,
          });

          if (
            !threadDetails.data.messages.some(
              (msg) =>
                msg.labelIds.includes("SENT") &&
                msg.payload.headers.find(
                  (header) =>
                    header.name === "From" &&
                    header.value.includes("banerjeeaviroop01@gmail.com")
                )
            )
          ) {
            console.log(
              `New email thread with subject "${
                messageDetails.data.payload.headers.find(
                  (header) => header.name === "Subject"
                ).value
              }" and thread ID ${threadId} received!`
            );

            // Sending a response to new unread Threads
            const transporter = nodemailer.createTransport({
              service: "gmail",
              auth: {
                type: "OAuth2",
                user: "banerjeeaviroop01@gmail.com",
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_SECRET,
                refreshToken: process.env.REFRESH_TOKEN,
                accessToken: oAuth2Client.getAccessToken(),
              },
            });

            const mailOptions = {
              from: "banerjeeaviroop01@gmail.com",
              to: messageDetails.data.payload.headers.find(
                (header) => header.name === "From"
              ).value,
              subject:
                "Re: " +
                messageDetails.data.payload.headers.find(
                  (header) => header.name === "Subject"
                ).value,
              text: "Thank you for your message. I will respond as soon as I am available",
            };

            transporter.sendMail(mailOptions, (err, info) => {
              if (err) {
                console.log(err);
              } else {
                console.log(
                  `Automatic response sent to ${
                    messageDetails.data.payload.headers.find(
                      (header) => header.name === "From"
                    ).value
                  }: ${info.response}`
                );
              }
            });

            // TODO: If a response is required, use the `nodemailer` package to send an automatic response.

            // Update the timestamp to the current time, so we only check for new messages that arrive after this point.
            // timestamp = new Date().getTime();
          } else {
            console.log(
              `Email thread with thread ID ${threadId} already has a reply from you.`
            );
          }
        }
      } else {
        console.log("No new messages.");
      }
    }
  );
};

setInterval(checkForNewMessages, 50000);

app.get("/", async (req, res) => {
  res.send("Gmail Replier");
});

app.listen(process.env.PORT, () => {
  console.log("listening on port " + process.env.PORT);
});

