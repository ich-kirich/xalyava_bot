import TelegramBot from "node-telegram-bot-api";
import config from "config";
import BotControllers from "./controllers/botControllers";
import initDb from "./models/initDb";
import logger from "./libs/logger";
import ApiError from "./error/apiError";

console.log(config.get("telegram.apiKey"));
console.log(config.get("db.password"));

const startBot = async () => {
  try {
    console.log(1)
    await initDb();
    console.log(2)
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
