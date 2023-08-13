import ApiError from "../error/apiError";
import { StatusCodes } from "http-status-codes";
import TelegramBot, { InputMediaPhoto } from "node-telegram-bot-api";
import { linkSite, MESSAGES } from "../libs/constants";
import { addNewUser, startMailing, stopMailing } from "../services/botServices";
import getPostFromWebsite from "../libs/parsingSite";

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
            const { postText, imagesArray } = await getPostFromWebsite(
              linkSite,
            );
            const media: InputMediaPhoto[] = imagesArray.map(
              (imageUrl) => ({
                type: "photo",
                media: imageUrl,
              }),
            );
            await bot.sendMediaGroup(chatId, media);
            await bot.sendMessage(chatId, postText, {
              disable_web_page_preview: true,
              parse_mode: "Markdown",
            });
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
