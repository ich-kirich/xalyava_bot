import TelegramBot, { InputMediaPhoto } from "node-telegram-bot-api";
import { IPost } from "../types/types";
import ApiError from "../error/apiError";
import { getUsersForMailing, updateTodayPost } from "../services/botServices";
import { linkSite, MESSAGES } from "./constants";
import logger from "./logger";
import { getPostsFromWebsite } from "./parsingSite";

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

export async function sendingPosts(bot: TelegramBot) {
  const postsContent = await getPostsFromWebsite(linkSite);
  if (postsContent.length > 0) {
    await updateTodayPost(postsContent[0]);
  }
  const chatsIds = await getUsersForMailing();

  if (postsContent.length === 0) {
    await sendSorryMessage(bot, chatsIds);
    return;
  }

  for (const postContent of postsContent) {
    await sendPost(bot, postContent, chatsIds);
  }
}
