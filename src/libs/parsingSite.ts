import axios from "axios";
import * as cheerio from "cheerio";
import { StatusCodes } from "http-status-codes";
import * as iconv from "iconv-lite";
import ApiError from "../error/apiError";
import htmlToMd from "html-to-md";
import { addSpacesToMarkdownLink, removeSpecialCharacters } from "./utils";
import { addPosts } from "../services/botServices";

async function getPosts(html: string) {
  const $ = cheerio.load(html);
  const storiesDivs = $(".story").toArray().slice(0, 5);
  const postsIds = storiesDivs.map((storyDiv) =>
    parseInt($(storyDiv).attr("data-story-id")),
  );
  const newIdsPosts = await addPosts(postsIds);
  if (newIdsPosts !== null) {
    const resultPosts = [];

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

    return resultPosts;
  }
  return null;
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

  return imageSrcArray;
}

function deleteImages(html: string) {
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

  return namePost + "\n\n" + mardownText;
}

function fixMardown(text: string): string {
  const regex = /\*\*(.*?)\*\*/g;
  const removeBold = text.replace(regex, "$1");
  const escapeMardownList = removeBold.replace(/\*/g, "\\*");
  const removeSlash = escapeMardownList.replace(/\\\]/g, "]");
  const addSpaceLink = addSpacesToMarkdownLink(removeSlash);
  return addSpaceLink;
}

async function getPostsFromWebsite(url: string) {
  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
      responseType: "arraybuffer",
    });
    const ruHtml = iconv.decode(response.data, "win1251");
    const posts = await getPosts(ruHtml);
    if (posts !== null) {
      const resultPosts = [];
      for(const post of posts) {
        const postId = post.postId;
        const imagesArray = extractImages(post.postContent);
        const htmlWithOutImages = deleteImages(post.postContent);
        const markdownText = htmlToMd(htmlWithOutImages);
        const rightMarkdown = fixMardown(markdownText);
        const postText = addNamePost(rightMarkdown, post.postBlock);
        resultPosts.push({ postId, postText, imagesArray });
      }
      return resultPosts;
    }
    return null;
  } catch (e) {
    console.log(
      new ApiError(e.status || StatusCodes.INTERNAL_SERVER_ERROR, e.message),
    );
  }
}

export default getPostsFromWebsite;
