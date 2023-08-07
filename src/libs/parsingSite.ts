import axios from "axios";
import * as cheerio from "cheerio";
import * as iconv from "iconv-lite";
import IStory from "../types/types";

function extractImagesAndTextFromStory(html: cheerio.Element) {
  const $ = cheerio.load(html);
  const NameStoryDiv = $(".story__title-link");
  const NameStory = `[${NameStoryDiv.text()}](${NameStoryDiv.attr("href")})`;
  const targetDiv = $(".story__content-inner");

  const imagesArray = targetDiv
    .find(".story-block_type_image img")
    .map((_, el) => $(el).attr("data-large-image") || $(el).attr("src"))
    .get();

  const textArray = targetDiv
    .find(".story-block_type_text")
    .map((_, el) => {
      const text = $(el)
        .contents()
        .filter((_, child) => child.type === "text")
        .text()
        .trim();
      if (text) {
        return text;
      } else {
        const linkElem = $(el).find("a");
        if (linkElem.length > 0) {
          const linkHref = linkElem.attr("href");
          const linkText = linkElem.text();
          const attachLink = `[${linkText}](${linkHref})`;
          return attachLink;
        }
        return $(el).text().trim();
      }
    })
    .get();

  return { imagesArray, textArray, NameStory };
}

function generateMessagePost(post: IStory) {
  
}

async function getDivFromWebsite(url: string) {
  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
      responseType: "arraybuffer",
    });
    const ruHtml = iconv.decode(response.data, "win1251");
    const $ = cheerio.load(ruHtml);
    const storiesDivs = $(".story").toArray().slice(0, 5);
    const storiesArray = storiesDivs.map((el) => {
      const { imagesArray, textArray, NameStory } = extractImagesAndTextFromStory(el);
      return { imagesArray, textArray, NameStory };
    });
    console.log(storiesArray);
    return 0;
  } catch (error) {
    console.error("Error fetching data:", error.message);
    return null;
  }
}

export default getDivFromWebsite;
