import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";

const discordWebhookUrl = defineSecret("DISCORD_WEBHOOK_URL");

interface ContactPayload {
  name?: string;
  email?: string;
  message?: string;
}

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export const contact = onRequest(
  {secrets: [discordWebhookUrl], region: "us-central1"},
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    const {name, email, message} = req.body as ContactPayload;

    if (!name || !email || !message) {
      res.status(400).json({error: "Missing required fields"});
      return;
    }

    const webhookUrl = discordWebhookUrl.value();

    if (!webhookUrl) {
      res.status(500).json({error: "Webhook not configured"});
      return;
    }

    const fields: DiscordEmbedField[] = [
      {name: "Name", value: String(name).slice(0, 256), inline: true},
      {name: "Email", value: String(email).slice(0, 256), inline: true},
      {name: "Message", value: String(message).slice(0, 1024)},
    ];

    const discordPayload = {
      embeds: [
        {
          title: "New contact form submission",
          color: 0x58a6ff,
          fields,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    try {
      const discordRes = await fetch(webhookUrl, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(discordPayload),
      });

      if (!discordRes.ok) {
        res.status(502).json({error: "Failed to deliver message"});
        return;
      }

      res.status(200).json({success: true});
    } catch {
      res.status(502).json({error: "Failed to deliver message"});
    }
  }
);