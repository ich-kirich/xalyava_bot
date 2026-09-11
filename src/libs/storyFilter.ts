import * as cheerio from "cheerio";

export function isRealStory(storyHtml: string | null): boolean {
  if (!storyHtml) {
    return false;
  }

  const $ = cheerio.load(storyHtml);
  return (
    $(".story__placeholder").length === 0 &&
    $(".story__content-inner").length > 0 &&
    $(".story__title-link").length > 0
  );
}
