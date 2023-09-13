import axios from "axios";
import * as iconv from "iconv-lite";
import htmlToMd from "html-to-md";
import ApiError from "../error/apiError";
import { IPost } from "../types/types";
import logger from "./logger";
import {
  getPosts,
  extractImages,
  deleteImages,
  fixMarkdown,
  addNamePost,
  addVideoLinks,
} from "./parsingSite";

async function getPostsFromWebsite(url: string): Promise<IPost[]> {
  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
      responseType: "arraybuffer",
    });
    const ruHtml = iconv.decode(response.data, "win1251");
    const posts = await getPosts(ruHtml);
    const resultPosts: IPost[] = [];
    for (const post of posts) {
      const { postId, postContent, postBlock, linksVideos } = post;
      const imagesArray = extractImages(postContent);
      const htmlWithOutImages = deleteImages(postContent);
      const markdownText = htmlToMd(htmlWithOutImages);
      const rightMarkdown = fixMarkdown(markdownText);
      const textWithName = addNamePost(rightMarkdown, postBlock);
      const postText = addVideoLinks(textWithName, linksVideos);
      resultPosts.push({ postId, postText, imagesArray });
    }
    logger.info("Final array of posts for distribution was obtained");
    return resultPosts;
  } catch (e) {
    logger.error(
      "Error when generating the final array with posts for distribution",
      new ApiError(e.status, e.message),
    );
    throw new ApiError(e.status, e.message);
  }
}

export default getPostsFromWebsite;
