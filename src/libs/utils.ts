import { TELEGRAM_MESSAGE_LIMIT } from "./constants";

const TAG_PATTERN = /<\/?([a-zA-Z][a-zA-Z0-9-]*)[^>]*>/g;

const VOID_TAGS = new Set(["br", "hr", "img"]);

interface OpenTag {
  name: string;
  index: number;
  raw: string;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function openTagsAt(html: string): OpenTag[] {
  const pattern = new RegExp(TAG_PATTERN.source, "g");
  const openTags: OpenTag[] = [];
  let match = pattern.exec(html);
  while (match) {
    const name = match[1].toLowerCase();
    const isClosing = match[0].startsWith("</");
    const isVoid = match[0].endsWith("/>") || VOID_TAGS.has(name);
    if (isClosing) {
      const openIndex = openTags.map((tag) => tag.name).lastIndexOf(name);
      if (openIndex >= 0) {
        openTags.splice(openIndex, 1);
      }
    } else if (!isVoid) {
      openTags.push({ name, index: match.index, raw: match[0] });
    }
    match = pattern.exec(html);
  }
  return openTags;
}

function closingTagsFor(openTags: OpenTag[]): string {
  return openTags
    .map((tag) => `</${tag.name}>`)
    .reverse()
    .join("");
}

function findCut(rest: string, limit: number): number {
  const boundaries = [
    rest.lastIndexOf("\n\n", limit),
    rest.lastIndexOf("\n", limit),
    rest.lastIndexOf(" ", limit),
  ];
  const cut = boundaries.find((boundary) => boundary > 0);
  return cut ?? limit;
}

function moveCutOutOfTag(rest: string, cut: number, limit: number): number {
  const chunk = rest.slice(0, cut);
  const lastOpenAngle = chunk.lastIndexOf("<");
  const lastCloseAngle = chunk.lastIndexOf(">");
  if (lastOpenAngle <= lastCloseAngle) {
    return cut;
  }
  if (lastOpenAngle > 0) {
    return lastOpenAngle;
  }
  const tagEnd = rest.indexOf(">");
  if (tagEnd >= 0 && tagEnd + 1 <= limit) {
    return tagEnd + 1;
  }
  return cut;
}

/**
 * Splits already rendered Telegram HTML so that every chunk stays valid markup:
 * cuts happen on paragraph, line or word boundaries and never inside a tag,
 * and tags that stay open at the cut are closed and reopened in the next chunk.
 */
export function splitHtmlText(
  text: string,
  maxLen = TELEGRAM_MESSAGE_LIMIT,
): string[] {
  if (!text || text.length <= maxLen) {
    return [text];
  }

  const chunks: string[] = [];
  let rest = text;
  while (rest.length > maxLen) {
    let reserve = 0;
    let chunk = "";
    let reopened = "";
    let cut = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
      const limit = maxLen - reserve;
      cut = moveCutOutOfTag(rest, findCut(rest, limit), limit);
      const openTags = openTagsAt(rest.slice(0, cut));
      if (openTags.length === 0) {
        chunk = rest.slice(0, cut).trimEnd();
        reopened = "";
        break;
      }
      if (openTags[0].index > 0) {
        cut = openTags[0].index;
        chunk = rest.slice(0, cut).trimEnd();
        reopened = "";
        break;
      }
      const closingTags = closingTagsFor(openTags);
      chunk = rest.slice(0, cut).trimEnd() + closingTags;
      reopened = openTags.map((tag) => tag.raw).join("");
      if (chunk.length <= maxLen) {
        break;
      }
      reserve = closingTags.length;
    }
    if (cut <= 0) {
      cut = maxLen;
      chunk = rest.slice(0, cut);
      reopened = "";
    }
    chunks.push(chunk);
    rest = reopened + rest.slice(cut).trimStart();
  }
  if (rest) {
    chunks.push(rest);
  }
  return chunks;
}
