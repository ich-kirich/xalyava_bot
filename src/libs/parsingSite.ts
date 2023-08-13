import axios from "axios";
import * as cheerio from "cheerio";
import { StatusCodes } from "http-status-codes";
import * as iconv from "iconv-lite";
import ApiError from "../error/apiError";
import htmlToMd from "html-to-md";
import { addSpacesToMarkdownLink, removeSpecialCharacters } from "./utils";

function getPost(html: string) {
  const $ = cheerio.load(html);
  const storiesDivs = $(".story__main").toArray().slice(0, 5);
  const postBlock = $(storiesDivs[0]).html();
  const postContent = cheerio.load(postBlock)(".story__content-inner").html();
  return { postBlock, postContent };
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
  const removeSlash = escapeMardownList.replace(/\\\]/g, ']');
  const addSpaceLink = addSpacesToMarkdownLink(removeSlash);
  return addSpaceLink;
}

async function getPostFromWebsite(url: string) {
  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
      responseType: "arraybuffer",
    });
    const ruHtml = iconv.decode(response.data, "win1251");
    const { postBlock, postContent } = getPost(ruHtml);
    const imagesArray = extractImages(postContent);
    const htmlWithOutImages = deleteImages(postContent);
    const markdownText = htmlToMd(htmlWithOutImages);
    const rightMarkdown = fixMardown(markdownText);
    const postText = addNamePost(rightMarkdown, postBlock);
    return { postText, imagesArray };
  } catch (e) {
    console.log(
      new ApiError(e.status || StatusCodes.INTERNAL_SERVER_ERROR, e.message),
    );
  }
}

export default getPostFromWebsite;
