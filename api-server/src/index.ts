import app from "./app";
import { logger } from "./lib/logger";

async function tgPost(method: string, body: object): Promise<{ ok: boolean; description?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ ok: boolean; description?: string }>;
}

async function setupBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const domain = process.env.APP_DOMAIN;
  if (!token || !domain) {
    logger.warn("TELEGRAM_BOT_TOKEN or APP_DOMAIN not set — skipping bot setup");
    return;
  }

  const appUrl = `https://${domain}/`;
  const webhookUrl = `https://${domain}/api/payments/webhook`;

  try {
    const webhook = await tgPost("setWebhook", { url: webhookUrl });
    if (webhook.ok) {
      logger.info({ webhookUrl }, "Telegram webhook registered");
    } else {
      logger.warn({ description: webhook.description }, "Telegram webhook registration failed");
    }
  } catch (err) {
    logger.warn({ err }, "Could not register Telegram webhook");
  }

  try {
    const menu = await tgPost("setChatMenuButton", {
      menu_button: { type: "web_app", text: "Играть 🚀", web_app: { url: appUrl } },
    });
    if (menu.ok) {
      logger.info({ appUrl }, "Telegram menu button set");
    } else {
      logger.warn({ description: menu.description }, "Telegram menu button setup failed");
    }
  } catch (err) {
    logger.warn({ err }, "Could not set Telegram menu button");
  }

  try {
    const commands = await tgPost("setMyCommands", {
      commands: [
        { command: "start", description: "Открыть StreamRush 🚀" },
        { command: "play",  description: "Запустить игру" },
      ],
    });
    if (commands.ok) {
      logger.info("Telegram bot commands set");
    }
  } catch (err) {
    logger.warn({ err }, "Could not set Telegram bot commands");
  }
}

const rawPort = process.env["PORT"] ?? "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  setupBot();
});
