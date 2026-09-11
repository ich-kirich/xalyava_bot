import { TELEGRAM_MESSAGE_LIMIT } from "./constants";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function addSpacesToMarkdownLink(text: string): string {
  const modifiedText = text.replace(/\[.*?\]\(.*?\)/g, (match) => ` ${match} `);
  return modifiedText;
}

export function removeSpecialCharacters(text: string): string {
  const regex = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\\-\/='"]/g;
  return text.replace(regex, "");
}

export function escapeMarkdownSpecialCharacters(text: string): string {
  const markdownSpecialCharacters = [
    "_",
  ];

  let escapedText = text;

  for (const char of markdownSpecialCharacters) {
    escapedText = escapedText.split(char).join(`\\${char}`);
  }

  return escapedText;
}

export function splitTelegramText(
  text: string,
  maxLen = TELEGRAM_MESSAGE_LIMIT,
): string[] {
  if (!text) {
    return [text];
  }
  if (text.length <= maxLen) {
    return [text];
  }

  const chunks: string[] = [];
  let rest = text;
  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf("\n", maxLen);
    if (cut <= 0) {
      cut = rest.lastIndexOf(" ", maxLen);
    }
    if (cut <= 0) {
      cut = maxLen;
    }
    const lastOpen = rest.lastIndexOf("[", cut - 1);
    if (lastOpen >= 0) {
      const maybeLink = rest.slice(lastOpen, cut);
      const incompleteLink =
        !maybeLink.includes("]") ||
        (maybeLink.includes("](") && !maybeLink.includes(")"));
      if (incompleteLink && lastOpen > 0) {
        cut = lastOpen;
      }
    }
    chunks.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) {
    chunks.push(rest);
  }
  return chunks;
}
