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
import logger from "../libs/logger";
import ApiError from "../error/apiError";

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
            logger.info("An invalid command was received");
            break;
        }
        logger.info("Bot is ready to respond to user messages");
      });
    } catch (e) {
      logger.error(
        "Error when the bot responds to user messages",
        new ApiError(e.status, e.message),
      );
    }
  }

  sendPosts(bot: TelegramBot) {
    const timeCrone: string = config.get("sendPost.timeCrone");
    const job = cron.schedule(timeCrone, async () => {
      const postsContent = await getPostsFromWebsite(linkSite);
      const chatsIds = await getUsersForMailing();
      if (postsContent.length !== 0) {
        for (const postContent of postsContent) {
          const { imagesArray, postText } = postContent;
          const media: InputMediaPhoto[] = imagesArray.map((imageUrl) => ({
            type: "photo",
            media: imageUrl,
          }));
          for (const chatId of chatsIds) {
            try {
              await bot.sendMediaGroup(chatId, media);
              await bot.sendMessage(chatId, postText, {
                disable_web_page_preview: true,
                parse_mode: "Markdown",
              });
              logger.info(
                `Bot sent a post to the user with this id: ${chatId}`,
                postContent,
              );
            } catch (e) {
              logger.error(
                `Error when sending a post to a user with id: ${chatId}`,
                new ApiError(e.status, e.message),
              );
            }
          }
        }
      } else {
        for (const chatId of chatsIds) {
          try {
            bot.sendMessage(chatId, MESSAGES.NO_NEW_POSTS);
            logger.info(
              `Bot sends a message that there are no new posts to the user with this id: ${chatId}`,
            );
          } catch (e) {
            logger.error(
              `Error when sending a message about no new posts to a user with id: ${chatId}`,
              new ApiError(e.status, e.message),
            );
          }
        }
      }
    });
    job.start();
    logger.info("Bot has started a daily mailing");
  }
}

export default new BotControllers();
