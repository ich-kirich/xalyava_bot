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
