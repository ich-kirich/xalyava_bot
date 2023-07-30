import ApiError from "../error/apiError";
import { StatusCodes } from "http-status-codes";
import TelegramBot from "node-telegram-bot-api";
import { MESSAGES } from "../libs/constants";

class BotControllers {
  messagesToBot(bot: TelegramBot) {
    try {
      bot.on("message", (msg) => {
        const message = msg.text;
        const chatId = msg.chat.id;

        switch (message) {
          case "/start":
            bot.sendMessage(chatId, MESSAGES.HELLO_MESSAGE, {
              disable_web_page_preview: true,
            });
            break;
          case "/startxalyava":
            bot.sendMessage(chatId, MESSAGES.START_MAILING);
            break;
          case "/stopxalyava":
            bot.sendMessage(chatId, MESSAGES.STOP_MAILING);
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
