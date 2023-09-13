import axios from "axios";
import * as cheerio from "cheerio";
import * as iconv from "iconv-lite";
import htmlToMd from "html-to-md";
import { addSpacesToMarkdownLink, escapeMarkdownSpecialCharacters, removeSpecialCharacters } from "./utils";
import { updatePosts } from "../services/botServices";
import { IPost, IPostInf } from "../types/types";
import logger from "./logger";
import ApiError from "../error/apiError";

export function getLinksVideos(html: string): string[] {
  const $ = cheerio.load(html);
  const videoLinks: string[] = [];
  $(".player").each((index, element) => {
    const videoSource = $(element).attr("data-source");
    if (videoSource) {
      videoLinks.push(escapeMarkdownSpecialCharacters(videoSource));
    }
  });
  return videoLinks;
}

export async function getPosts(html: string): Promise<IPostInf[]> {
  const $ = cheerio.load(html);
  const storiesDivs = $(".story").toArray().slice(0, 5);
  const postsIds = storiesDivs.map((storyDiv) =>
    parseInt($(storyDiv).attr("data-story-id")),
  );
  const newIdsPosts: number[] = await updatePosts(postsIds);
  const resultPosts: IPostInf[] = [];

  for (const storyDiv of storiesDivs) {
    const postId = parseInt($(storyDiv).attr("data-story-id"));

    if (newIdsPosts.includes(postId)) {
      const postBlock = $(storyDiv).html();
      const postContent = cheerio
        .load(postBlock)(".story__content-inner")
        .html();
      const linksVideos = getLinksVideos(
        cheerio.load(postBlock)(".story__content-inner").html(),
      );
      resultPosts.push({ postId, postBlock, postContent, linksVideos });
    }
  }
  logger.info("Received an array of posts for distribution");
  return resultPosts;
}

export function extractImages(html: string): string[] {
  const $ = cheerio.load(html);
  const imageSrcArray: string[] = [];
  $(".story-image__image[data-src]").each((index, element) => {
    const imageSrc = $(element).attr("data-src");
    imageSrcArray.push(imageSrc);
  });
  logger.info("Array of images for the post was obtained");
  return imageSrcArray;
}

export function deleteImages(html: string): string {
  const $ = cheerio.load(html);
  $(".story-image__image").remove();
  console.log($)
  return $.html();
}

export function addNamePost(markdownText: string, html: string): string {
  const $ = cheerio.load(html);
  const link = $(".story__title-link");
  const title = removeSpecialCharacters(link.text());
  const href = link.attr("href");
  const namePost = `[${title}](${href})`;
  const finalText = `${namePost}\n\n${markdownText}`;
  logger.info("Title and text of the post have been merged");
  return finalText;
}

export function addVideoLinks(postText: string, linksVideos: string[]) {
  const linksString = "\n" + linksVideos.join("\n");
  return postText + "\n" + linksString;
}

export function fixMarkdown(text: string): string {
  const removeBold = text.replace(/\*\*(.*?)\*\*/g, "$1");
  const escapeMardownList = removeBold.replace(/\*/g, "\\*");
  const removeSlash = escapeMardownList.replace(/\\\]/g, "]");
  const addSpaceLink = addSpacesToMarkdownLink(removeSlash);
  logger.info("Mardown the post markup has been corrected");
  return addSpaceLink;
}
