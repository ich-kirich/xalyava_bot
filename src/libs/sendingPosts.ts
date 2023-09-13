import TelegramBot, { InputMediaPhoto } from "node-telegram-bot-api";
import { IPost } from "../types/types";
import ApiError from "../error/apiError";
import { MESSAGES } from "./constants";
import logger from "./logger";

export async function sendSorryMessage(bot: TelegramBot, chatsIds: number[]) {
  for (const chatId of chatsIds) {
    try {
      await bot.sendMessage(chatId, MESSAGES.NO_NEW_POSTS);
      logger.info(
        `Bot sends a message about no new posts to the user with id: ${chatId}`,
      );
    } catch (e) {
      logger.error(
        `Error when sending a message about no new posts to a user with id: ${chatId}`,
        new ApiError(e.status, e.message),
      );
      throw new ApiError(e.status, e.message);
    }
  }
}

export async function sendPost(
  bot: TelegramBot,
  postContent: IPost,
  chatsIds: number[],
) {
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
      logger.info(`Bot sent a post to the user with this id: ${chatId}`);
    } catch (e) {
      logger.error(
        `Error when sending a post to a user with id: ${chatId}`,
        new ApiError(e.status, e.message),
      );
      throw new ApiError(e.status, e.message);
    }
  }
}
