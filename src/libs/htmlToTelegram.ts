import * as cheerio from "cheerio";
import logger from "./logger";

const SITE_ORIGIN = "https://pikabu.ru";

/**
 * Blocks that cannot be shown inside a Telegram message: images go to the album,
 * videos go to the links at the end of the post, the rest is site interface.
 */
const NOISE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "svg",
  "button",
  "img",
  "video",
  "source",
  "iframe",
  "[hidden]",
  ".story-block_type_image",
  ".story-block_type_video",
  ".story-block_type_carousel",
  ".story-image",
  ".carousel",
  ".carousel-bullets",
  ".player",
  ".story__read-more",
].join(", ");

const NOISE_LINES = [/^показать полностью/i, /^перейти к видео$/i];

const INLINE_TAGS: Record<string, string> = {
  b: "b",
  strong: "b",
  i: "i",
  em: "i",
  u: "u",
  ins: "u",
  s: "s",
  strike: "s",
  del: "s",
  code: "code",
  pre: "pre",
};

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

const BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "body",
  "dd",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "footer",
  "header",
  "html",
  "main",
  "ol",
  "p",
  "section",
  "table",
  "tbody",
  "thead",
  "tr",
  "ul",
]);

interface HtmlNode {
  type: string;
  name?: string;
  data?: string;
  attribs?: Record<string, string>;
  children?: HtmlNode[];
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export function absoluteUrl(href: string | undefined): string {
  if (!href) {
    return "";
  }
  const link = href.replace(/&amp;/g, "&").trim();
  if (link.startsWith("//")) {
    return `https:${link}`;
  }
  if (link.startsWith("/")) {
    return `${SITE_ORIGIN}${link}`;
  }
  if (!/^https?:\/\//i.test(link)) {
    return "";
  }
  return link;
}

/**
 * Pikabu wraps outgoing links into its own redirect, the real address is kept in
 * the "u" query parameter.
 */
export function unwrapPikabuUrl(href: string | undefined): string {
  const link = absoluteUrl(href);
  if (!link) {
    return "";
  }
  try {
    const parsed = new URL(link);
    if (!/(^|\.)pikabu\.ru$/i.test(parsed.hostname)) {
      return link;
    }
    const target = parsed.searchParams.get("u");
    return target ? absoluteUrl(target) || link : link;
  } catch {
    return link;
  }
}

function isElement(node: HtmlNode): boolean {
  return node.type === "tag" && Boolean(node.name);
}

function visibleText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function needsSpaceBeforeInline(previous: string, next: string): boolean {
  return (
    /[\p{L}\p{N}]$/u.test(previous) && /^<(a|b|code|i|pre|s|u)\b/i.test(next)
  );
}

function renderNodes(nodes: HtmlNode[]): string {
  return nodes.reduce((result, node) => {
    const chunk = renderNode(node);
    if (!chunk) {
      return result;
    }
    if (needsSpaceBeforeInline(result, chunk)) {
      return `${result} ${chunk}`;
    }
    return `${result}${chunk}`;
  }, "");
}

/**
 * Wraps the content of an inline element keeping the spaces around it outside of
 * the tag, otherwise words glue together after trimming.
 */
function wrapInline(content: string, openTag: string, tag: string): string {
  const [, before, core, after] = content.match(/^(\s*)([\s\S]*?)(\s*)$/) ?? [];
  if (!core) {
    return "";
  }
  return `${before}${openTag}${core}</${tag}>${after}`;
}

/**
 * A link whose text is the address itself stays a plain address: on the site it
 * looks the same way and in Telegram it is clickable without any markup.
 */
function renderLink(node: HtmlNode): string {
  const content = renderNodes(node.children ?? []);
  if (!content.trim()) {
    return "";
  }
  const url = unwrapPikabuUrl(node.attribs?.href);
  if (!url) {
    return content;
  }
  if (/^https?:\/\/\S+$/i.test(visibleText(content))) {
    return escapeHtml(url);
  }
  return wrapInline(content, `<a href="${escapeAttribute(url)}">`, "a");
}

function renderNode(node: HtmlNode): string {
  if (node.type === "text") {
    return escapeHtml((node.data ?? "").replace(/\s+/g, " "));
  }
  if (!isElement(node)) {
    return "";
  }

  const tag = (node.name ?? "").toLowerCase();
  const children = node.children ?? [];

  if (tag === "br") {
    return "\n";
  }
  if (tag === "hr") {
    return "\n\n";
  }
  if (tag === "a") {
    return renderLink(node);
  }
  if (tag === "li") {
    const content = renderNodes(children).trim();
    return content ? `\n• ${content}` : "";
  }
  if (tag === "td" || tag === "th") {
    const content = renderNodes(children).trim();
    return content ? `${content} ` : "";
  }
  if (HEADING_TAGS.has(tag)) {
    const content = renderNodes(children).trim();
    return content ? `\n\n<b>${content}</b>\n\n` : "";
  }
  if (tag === "blockquote") {
    const content = renderNodes(children).trim();
    if (!content) {
      return "";
    }
    if (/^https?:\/\/\S+$/i.test(visibleText(content))) {
      return `\n\n${content}\n\n`;
    }
    return `\n\n<blockquote>${content}</blockquote>\n\n`;
  }
  if (INLINE_TAGS[tag]) {
    const telegramTag = INLINE_TAGS[tag];
    return wrapInline(renderNodes(children), `<${telegramTag}>`, telegramTag);
  }
  if (BLOCK_TAGS.has(tag)) {
    const content = renderNodes(children).trim();
    return content ? `\n\n${content}\n\n` : "";
  }
  return renderNodes(children);
}

function normalizeText(text: string): string {
  const lines = text.split("\n").map((line) => {
    const cleanLine = line.replace(/[ \t\u00a0]+/g, " ").trim();
    return NOISE_LINES.some((pattern) => pattern.test(cleanLine))
      ? ""
      : cleanLine;
  });
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Converts the story markup into Telegram HTML: only the tags that Telegram
 * understands are kept, everything else becomes line breaks and bullets.
 */
export function htmlToTelegram(html: string): string {
  const $ = cheerio.load(html);
  $(NOISE_SELECTORS).remove();
  const nodes = $("body").contents().toArray() as unknown as HtmlNode[];
  const text = normalizeText(renderNodes(nodes));
  logger.info("Post markup has been converted to Telegram html");
  return text;
}

export function htmlToPlainText(html: string): string {
  return normalizeText(
    html
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&"),
  );
}
