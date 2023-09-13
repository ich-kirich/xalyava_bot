import TelegramBot from "node-telegram-bot-api";
import { updateTodayPost, getUsersForMailing } from "../services/botServices";
import { linkSite } from "./constants";
import getPostsFromWebsite from "./getPostsFromWebsite";
import { sendSorryMessage, sendPost } from "./sendingPosts";

export async function postDelivery(bot: TelegramBot) {
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

export default postDelivery;
