import axios from "axios";
import * as cheerio from "cheerio";
import * as iconv from "iconv-lite";
import htmlToMd from "html-to-md";
import { addSpacesToMarkdownLink, removeSpecialCharacters } from "./utils";
import { addPosts } from "../services/botServices";
import { IPost, IPostInf } from "../types/types";
import logger from "./logger";
import ApiError from "../error/apiError";

async function getPosts(html: string): Promise<IPostInf[]> {
  const $ = cheerio.load(html);
  const storiesDivs = $(".story").toArray().slice(0, 5);
  const postsIds = storiesDivs.map((storyDiv) =>
    parseInt($(storyDiv).attr("data-story-id")),
  );
  const newIdsPosts: number[] = await addPosts(postsIds);
  const resultPosts: IPostInf[] = [];

  for (const storyDiv of storiesDivs) {
    const postId = parseInt($(storyDiv).attr("data-story-id"));

    if (newIdsPosts.includes(postId)) {
      const postBlock = $(storyDiv).html();
      const postContent = cheerio
        .load(postBlock)(".story__content-inner")
        .html();
      resultPosts.push({ postId, postBlock, postContent });
    }
  }
  logger.info("Received an array of posts for distribution", resultPosts);
  return resultPosts;
}

function extractImages(html: string): string[] {
  const $ = cheerio.load(html);
  const imageSrcArray: string[] = [];

  $(".story-image__image").each((index, element) => {
    const imageSrc = $(element).attr("data-src");
    if (imageSrc) {
      imageSrcArray.push(imageSrc);
    }
  });
  logger.info("Array of images for the post was obtained", imageSrcArray);
  return imageSrcArray;
}

function deleteImages(html: string): string {
  const $ = cheerio.load(html);
  $(".story-image__image").remove();
  const updatedHtml = $.html();
  return updatedHtml;
}

function addNamePost(mardownText: string, html: string): string {
  const $ = cheerio.load(html);
  const link = $(".story__title-link");
  const title = removeSpecialCharacters(link.text());
  const href = link.attr("href");
  const namePost = `[${title}](${href})`;
  logger.info(
    "Title and text of the post have been merged",
    namePost + "\n\n" + mardownText,
  );
  return namePost + "\n\n" + mardownText;
}

function fixMardown(text: string): string {
  const regex = /\*\*(.*?)\*\*/g;
  const removeBold = text.replace(regex, "$1");
  const escapeMardownList = removeBold.replace(/\*/g, "\\*");
  const removeSlash = escapeMardownList.replace(/\\\]/g, "]");
  const addSpaceLink = addSpacesToMarkdownLink(removeSlash);
  logger.info("Mardown the post markup has been corrected", addSpaceLink);
  return addSpaceLink;
}

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
      const postId = post.postId;
      const imagesArray = extractImages(post.postContent);
      const htmlWithOutImages = deleteImages(post.postContent);
      const markdownText = htmlToMd(htmlWithOutImages);
      const rightMarkdown = fixMardown(markdownText);
      const postText = addNamePost(rightMarkdown, post.postBlock);
      resultPosts.push({ postId, postText, imagesArray });
    }
    logger.info(
      "Final array of posts for distribution was obtained",
      resultPosts,
    );
    return resultPosts;
  } catch (e) {
    logger.error(
      "Error when generating the final array with posts for distribution",
      new ApiError(e.status, e.message),
    );
  }
}

export default getPostsFromWebsite;
