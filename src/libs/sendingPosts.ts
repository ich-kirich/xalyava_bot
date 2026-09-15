import TelegramBot, { InputMediaPhoto } from "node-telegram-bot-api";
import { IPost } from "../types/types";
import ApiError from "../error/apiError";
import { getUsersForMailing, updateTodayPost } from "../services/botServices";
import { linkSite, MESSAGES } from "./constants";
import logger from "./logger";
import { getPostsFromWebsite } from "./parsingSite";
import { htmlToPlainText } from "./htmlToTelegram";
import { splitHtmlText } from "./utils";

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

export const TELEGRAM_ALBUM_LIMIT = 10;

function isParseError(e: { message?: string }): boolean {
  return /can't parse entities|unsupported start tag|can't find end tag/i.test(
    e?.message ?? "",
  );
}

export async function sendFormattedText(
  bot: TelegramBot,
  chatId: number,
  text: string,
) {
  try {
    await bot.sendMessage(chatId, text, {
      disable_web_page_preview: true,
      parse_mode: "HTML",
    });
  } catch (e) {
    if (!isParseError(e)) {
      throw e;
    }
    logger.warn(
      `Post markup was rejected by Telegram, sending it as plain text to the user with id: ${chatId}`,
    );
    await bot.sendMessage(chatId, htmlToPlainText(text), {
      disable_web_page_preview: true,
    });
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
  const albums: InputMediaPhoto[][] = [];
  for (let i = 0; i < media.length; i += TELEGRAM_ALBUM_LIMIT) {
    albums.push(media.slice(i, i + TELEGRAM_ALBUM_LIMIT));
  }

  for (const chatId of chatsIds) {
    try {
      for (const album of albums) {
        if (album.length === 1) {
          await bot.sendPhoto(chatId, album[0].media as string);
        } else {
          await bot.sendMediaGroup(chatId, album);
        }
      }
      for (const chunk of splitHtmlText(postText)) {
        await sendFormattedText(bot, chatId, chunk);
      }
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
  const chatsIds = await getUsersForMailing();

  if (postsContent.length === 0) {
    await sendSorryMessage(bot, chatsIds);
    return;
  }

  try {
    await updateTodayPost(postsContent[0]);
  } catch (e) {
    logger.error(
      "Today post was not saved, mailing continues",
      new ApiError(e.status, e.message),
    );
  }
  for (const postContent of postsContent) {
    await sendPost(bot, postContent, chatsIds);
  }
}
