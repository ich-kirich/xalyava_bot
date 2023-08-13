export function addSpacesToMarkdownLink(text: string): string {
  const modifiedText = text.replace(/\[.*?\]\(.*?\)/g, (match) => ` ${match} `);
  return modifiedText;
}

export function removeSpecialCharacters(text: string): string {
  const regex = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\\-\/='"]/g;
  return text.replace(regex, "");
}
