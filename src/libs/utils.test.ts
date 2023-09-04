import { addSpacesToMarkdownLink } from "./utils";

describe("addSpacesToMarkdownLink", () => {
  test("should add spaces around Markdown links", () => {
    const inputText = "This is [a link](https://example.com) in text.";
    const expectedOutput = "This is  [a link](https://example.com)  in text.";
    const result = addSpacesToMarkdownLink(inputText);
    expect(result).toEqual(expectedOutput);
  });

  test("should handle multiple Markdown links in the same text", () => {
    const inputText = "Links: [link1](url1) and [link2](url2)";
    const expectedOutput = "Links:  [link1](url1)  and  [link2](url2) ";
    const result = addSpacesToMarkdownLink(inputText);
    expect(result).toEqual(expectedOutput);
  });

  test("should handle Markdown links without spaces", () => {
    const inputText = "NoSpaces:[link](url)";
    const expectedOutput = "NoSpaces: [link](url) ";
    const result = addSpacesToMarkdownLink(inputText);
    expect(result).toEqual(expectedOutput);
  });

  test("should handle an empty input string", () => {
    const inputText = "";
    const expectedOutput = "";
    const result = addSpacesToMarkdownLink(inputText);
    expect(result).toEqual(expectedOutput);
  });

  test("should not add spaces to plain text", () => {
    const inputText = "This is plain text without links.";
    const expectedOutput = "This is plain text without links.";
    const result = addSpacesToMarkdownLink(inputText);
    expect(result).toEqual(expectedOutput);
  });
});