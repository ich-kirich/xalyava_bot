import ApiError from "../error/apiError";
import { StatusCodes } from "http-status-codes";
import TelegramBot from "node-telegram-bot-api";
import { MESSAGES } from "../libs/constants";
import { addNewUser, startMailing, stopMailing } from "../services/botServices";
import getDivFromWebsite from "../libs/parsingSite";

class BotControllers {
  messagesToBot(bot: TelegramBot) {
    try {
      bot.on("message", async (msg) => {
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
            await getDivFromWebsite("https://pikabu.ru/community/steam/new");
            break;
          case "/stopxalyava":
            bot.sendMessage(chatId, MESSAGES.STOP_MAILING);
            await stopMailing(userId);
            break;
          default:
            bot.sendMessage(chatId, MESSAGES.UNKNOWN_MEASSAGE);
            break;
        }
      });
    } catch (e) {
      console.log(
        new ApiError(e.status || StatusCodes.INTERNAL_SERVER_ERROR, e.message),
      );
    }
  }
}

export default new BotControllers();
