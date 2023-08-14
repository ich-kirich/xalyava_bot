import ApiError from "../error/apiError";
import { StatusCodes } from "http-status-codes";
import TelegramBot, { InputMediaPhoto } from "node-telegram-bot-api";
import { linkSite, MESSAGES } from "../libs/constants";
import {
  addNewUser,
  getUsersForMailing,
  startMailing,
  stopMailing,
} from "../services/botServices";
import getPostsFromWebsite from "../libs/parsingSite";
import config from "config";
import cron from "node-cron";

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

  sendPosts(bot: TelegramBot) {
    const timeCrone: string = config.get("sendPost.timeCrone");
    const job = cron.schedule(timeCrone, async () => {
      const postsContent = await getPostsFromWebsite(linkSite);
      const chatsIds = await getUsersForMailing();
      if (postsContent !== null) {
        for (const postContent of postsContent) {
          const media: InputMediaPhoto[] = postContent.imagesArray.map(
            (imageUrl) => ({
              type: "photo",
              media: imageUrl,
            }),
          );
          for (const chatId of chatsIds) {
            try {
              await bot.sendMediaGroup(chatId, media);
              await bot.sendMessage(chatId, postContent.postText, {
                disable_web_page_preview: true,
                parse_mode: "Markdown",
              });
            } catch (e) {
              console.error(e.message);
            }
          }
        }
      } else {
        for (const chatId of chatsIds) {
          try {
            bot.sendMessage(chatId, MESSAGES.NO_NEW_POSTS);
          } catch (e) {
            console.error(e.message);
          }
        }
      }
    });
    job.start();
  }
}

export default new BotControllers();
