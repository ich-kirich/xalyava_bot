import TelegramBot from "node-telegram-bot-api";
import config from "config";
import BotControllers from "./controllers/botControllers";
import initDb from "../models/initDb";
import logger from "./libs/logger";
import ApiError from "./error/apiError";

const startBot = async () => {
  try {
    await initDb();
    const bot = new TelegramBot(config.get("telegram.apiKey"), {
      polling: true,
    });
    BotControllers.messagesToBot(bot);
    BotControllers.sendPosts(bot);
    logger.info("The bot is up and running");
  } catch (e) {
    logger.error("Bot startup error", new ApiError(e.status, e.message));
  }
};

startBot();
