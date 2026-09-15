import axios from "axios";
import * as cheerio from "cheerio";
import * as iconv from "iconv-lite";
import { sleep } from "./utils";
import {
  absoluteUrl,
  escapeAttribute,
  escapeHtml,
  htmlToTelegram,
} from "./htmlToTelegram";
import { updatePosts } from "../services/botServices";
import { IPost, IPostInf } from "../types/types";
import logger from "./logger";
import ApiError from "../error/apiError";
import { isRealStory } from "./storyFilter";
import { FETCH_ATTEMPTS, FETCH_RETRY_DELAY_MS, POSTS_LIMIT } from "./constants";

type CookieJar = Map<string, string>;

function toCookieHeaders(setCookie: unknown): unknown[] {
  if (Array.isArray(setCookie)) {
    return setCookie;
  }
  if (typeof setCookie === "string") {
    return [setCookie];
  }
  return [];
}

function storeCookies(jar: CookieJar, setCookie: unknown): void {
  for (const header of toCookieHeaders(setCookie)) {
    const pair = String(header).split(";")[0];
    const eq = pair.indexOf("=");
    if (eq > 0) {
      jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }
}

function cookieHeader(jar: CookieJar): Record<string, string> {
  if (jar.size === 0) {
    return {};
  }
  return {
    Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
  };
}

function isDdosGuardChallenge(html: string): boolean {
  return (
    /<title>\s*DDoS-Guard\s*<\/title>/i.test(html) ||
    /ddos-guard\/js-challenge/i.test(html)
  );
}

export function getLinksVideos(html: string): string[] {
  const $ = cheerio.load(html);
  const videoLinks = new Set<string>();
  $("[data-role='player'] source[src], video source[src]").each(
    (index, element) => {
      const videoSource = $(element).attr("src");
      if (videoSource) {
        videoLinks.add(videoSource);
      }
    },
  );
  $(".player[data-source]").each((index, element) => {
    const videoSource = $(element).attr("data-source");
    if (videoSource) {
      videoLinks.add(videoSource);
    }
  });
  return [...videoLinks];
}

export async function getPosts(html: string): Promise<IPostInf[]> {
  const $ = cheerio.load(html);
  const storiesDivs = $(".story")
    .toArray()
    .filter((storyDiv) => isRealStory($(storyDiv).html()))
    .filter((storyDiv) =>
      Number.isFinite(Number($(storyDiv).attr("data-story-id"))),
    )
    .slice(0, 10);
  const postsIds = storiesDivs.map((storyDiv) =>
    Number($(storyDiv).attr("data-story-id")),
  );
  const newIdsPosts: number[] = await updatePosts(postsIds);
  const resultPosts: IPostInf[] = [];

  for (const storyDiv of storiesDivs) {
    const postId = Number($(storyDiv).attr("data-story-id"));

    if (newIdsPosts.includes(postId)) {
      const postBlock = $(storyDiv).html();
      if (!postBlock) {
        continue;
      }
      const postContent = cheerio
        .load(postBlock)(".story__content-inner")
        .html();
      if (!postContent) {
        continue;
      }
      const linksVideos = getLinksVideos(postContent);
      resultPosts.push({ postId, postBlock, postContent, linksVideos });
    }
  }
  logger.info("Received an array of posts for distribution");
  return resultPosts;
}

export function extractImages(html: string): string[] {
  const $ = cheerio.load(html);
  const imageSrcArray: string[] = [];
  const seen = new Set<string>();
  $(".story-image__image[data-src], .carousel__item img[data-src]").each(
    (index, element) => {
      const imageSrc = $(element).attr("data-src");
      if (imageSrc && !seen.has(imageSrc)) {
        seen.add(imageSrc);
        imageSrcArray.push(imageSrc);
      }
    },
  );
  logger.info("Array of images for the post was obtained");
  return imageSrcArray;
}

export function addNamePost(postText: string, html: string): string {
  const $ = cheerio.load(html);
  const title = $(".story__title-link")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();
  if (!title) {
    return postText;
  }
  logger.info("Title and text of the post have been merged");
  return [`<b>${escapeHtml(title)}</b>`, postText].filter(Boolean).join("\n\n");
}

export function addVideoLinks(postText: string, linksVideos: string[]): string {
  const links = linksVideos
    .map((link) => absoluteUrl(link))
    .filter((link) => link.length > 0);
  if (links.length === 0) {
    return postText;
  }
  const labeled = links.map((url, index) => {
    const label = links.length === 1 ? "Видео" : `Видео ${index + 1}`;
    return `<a href="${escapeAttribute(url)}">${label}</a>`;
  });
  return [postText, labeled.join("\n")].filter(Boolean).join("\n\n");
}

async function buildPosts(storiesHtml: string): Promise<IPost[]> {
  const posts = await getPosts(storiesHtml);
  const resultPosts: IPost[] = [];
  for (const post of posts) {
    const { postId, postContent, postBlock, linksVideos } = post;
    const imagesArray = extractImages(postContent);
    const telegramHtml = htmlToTelegram(postContent);
    const textWithName = addNamePost(telegramHtml, postBlock);
    const postText = addVideoLinks(textWithName, linksVideos);
    resultPosts.push({ postId, postText, imagesArray });
  }
  logger.info("Final array of posts for distribution was obtained");
  return resultPosts;
}

export async function getPostsFromWebsite(url: string): Promise<IPost[]> {
  try {
    const cookies: CookieJar = new Map();

    const fetchPage = async (pageUrl: string): Promise<string> => {
      let lastError: Error | undefined;
      for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
        try {
          const response = await axios.get(pageUrl, {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              ...cookieHeader(cookies),
            },
            responseType: "arraybuffer",
            validateStatus: () => true,
          });
          if (!response?.headers) {
            throw new Error("Pikabu request returned an empty response");
          }
          storeCookies(cookies, response.headers["set-cookie"]);
          const html = iconv.decode(response.data, "win1251");
          if (response.status >= 400 || isDdosGuardChallenge(html)) {
            throw new Error(
              `Pikabu request blocked (status ${response.status})`,
            );
          }
          return html;
        } catch (e) {
          lastError = e instanceof Error ? e : new Error(String(e));
          if (attempt < FETCH_ATTEMPTS) {
            await sleep(FETCH_RETRY_DELAY_MS);
          }
        }
      }
      throw lastError;
    };

    const firstPageHtml = await fetchPage(url);
    const firstPage = cheerio.load(firstPageHtml);
    const storyHtml = firstPage(".story")
      .toArray()
      .filter((story) => isRealStory(firstPage(story).html()))
      .map((story) => firstPage.html(story));

    if (storyHtml.length < POSTS_LIMIT) {
      const secondPageUrl = new URL(url);
      secondPageUrl.searchParams.set("page", "2");
      const secondPageHtml = await fetchPage(secondPageUrl.toString());
      const secondPage = cheerio.load(secondPageHtml);
      storyHtml.push(
        ...secondPage(".story")
          .toArray()
          .filter((story) => isRealStory(secondPage(story).html()))
          .map((story) => secondPage.html(story)),
      );
    }

    return await buildPosts(storyHtml.join(""));
  } catch (e) {
    const error = e as { status?: number; message?: string };
    logger.error(
      "Error when generating the final array with posts for distribution",
      new ApiError(error.status ?? 500, error.message ?? String(e)),
    );
    throw new ApiError(error.status ?? 500, error.message ?? String(e));
  }
}
