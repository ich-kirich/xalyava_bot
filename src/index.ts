import TelegramBot from "node-telegram-bot-api";
import config from "config";
import BotControllers from "./controllers/botControllers";
import initDb from "./models/initDb";
import logger from "./libs/logger";
import ApiError from "./error/apiError";
import { createHttpServer } from "./http/createHttpServer";
import { createRuntime } from "./http/runtime";
import {
  getBotCommands,
  getBotDescription,
  getBotShortDescription,
} from "./libs/constants";
import {
  setBotDescription,
  setBotShortDescription,
} from "./libs/botProfile";

const optionalConfig = (key: string): string =>
  config.has(key) ? String(config.get(key)) : "";

const startBot = async () => {
  const runtime = createRuntime();
  const webhookUrl = optionalConfig("telegram.webhookUrl");
  const webhookSecret = optionalConfig("telegram.webhookSecret");
  const httpPort = Number(config.get("http.port"));

  const server = createHttpServer({
    runtime,
    webhookSecret,
  });

  await new Promise<void>((resolve) => {
    server.listen(httpPort, () => resolve());
  });
  logger.info(`HTTP server listening on ${httpPort}`);

  try {
    await initDb();
    const useWebhook = Boolean(webhookUrl);
    const bot = new TelegramBot(config.get("telegram.apiKey"), {
      polling: !useWebhook,
    });

    if (useWebhook) {
      await bot.setWebHook(webhookUrl, {
        secret_token: webhookSecret,
      } as Parameters<TelegramBot["setWebHook"]>[1]);
      logger.info("Telegram webhook is set");
    } else {
      await bot.deleteWebHook();
      logger.info("Telegram polling is enabled");
    }

    BotControllers.messagesToBot(bot);
    BotControllers.sendPosts(bot);
    await bot.setMyCommands(getBotCommands());
    await setBotDescription(getBotDescription());
    await setBotShortDescription(getBotShortDescription());
    logger.info("Telegram command and bot descriptions are set");
    runtime.bot = bot;
    runtime.ready = true;
    logger.info("The bot is up and running");
  } catch (e) {
    logger.error("Bot startup error", new ApiError(e.status, e.message));
  }
};

startBot();
