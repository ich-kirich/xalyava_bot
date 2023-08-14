import TelegramBot from "node-telegram-bot-api";
import { MESSAGES } from "../libs/constants";
import {
  addNewUser,
  startMailing,
  stopMailing,
} from "../services/botServices";
import config from "config";
import cron from "node-cron";
import logger from "../libs/logger";
import ApiError from "../error/apiError";
import sendingPosts from "../libs/sendingPosts";

class BotControllers {
  messagesToBot(bot: TelegramBot) {
    bot.on("message", async (msg) => {
      try {
        const message = msg.text;
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        switch (message) {
          case "/start":
            bot.sendMessage(chatId, MESSAGES.HELLO_MESSAGE, {
              disable_web_page_preview: true,
            });
            await addNewUser(userId);
            break;
          case "/startxalyava":
            bot.sendMessage(chatId, MESSAGES.START_MAILING);
            await startMailing(userId);
            break;
          case "/stopxalyava":
            bot.sendMessage(chatId, MESSAGES.STOP_MAILING);
            await stopMailing(userId);
            break;
          default:
            bot.sendMessage(chatId, MESSAGES.UNKNOWN_MEASSAGE);
            logger.info("An invalid command was received");
            break;
        }
        logger.info("Bot is ready to respond to user messages");
      } catch (e) {
        logger.error(
          "Error when the bot responds to user messages",
          new ApiError(e.status, e.message),
        );
        throw new ApiError(e.status, e.message);
      }
    });
  }

  sendPosts(bot: TelegramBot) {
    const timeCrone: string = config.get("sendPost.timeCrone");
    const job = cron.schedule(timeCrone, async () => {
      await sendingPosts(bot);
    });
    job.start();
    logger.info("Bot has started a daily mailing");
  }
}

export default new BotControllers();
