import axios from "axios";
import * as cheerio from "cheerio";
import * as iconv from "iconv-lite";

function isLinkLike(text) {
  return (
    text.trim().startsWith("http://") || text.trim().startsWith("https://")
  );
}

function extractImagesAndTextFromStory(html) {
  const $ = cheerio.load(html);
  const targetDiv = $(".story__content-inner_slice-by-block");

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
        const hasLinkWithText = $(el).find("a").text().trim();
        if (!hasLinkWithText) {
          return $(el).text().trim();
        } else {
          if (isLinkLike(hasLinkWithText)) {
            const textWithoutLinks = $(el)
              .clone()
              .find("a")
              .remove()
              .end()
              .text()
              .trim();
            return textWithoutLinks;
          }
        }
      }
    })
    .get();

  return { imagesArray, textArray };
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
      const { imagesArray, textArray } = extractImagesAndTextFromStory(el);
      console.log("Images:", imagesArray);
      console.log("Text:", textArray);
      return 0;
    });
    return 0;
  } catch (error) {
    console.error("Error fetching data:", error.message);
    return null;
  }
}

export default getDivFromWebsite;
