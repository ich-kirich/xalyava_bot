import { addSpacesToMarkdownLink, escapeMarkdownSpecialCharacters, removeSpecialCharacters } from "./utils";

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

describe("removeSpecialCharacters", () => {
  test("should remove special characters from text", () => {
    const inputText =
      "This text contains special characters: !@#$%^&*()_+{}[]:;<>,.?~\\-/";
    const expectedOutput = "This text contains special characters ";
    const result = removeSpecialCharacters(inputText);
    expect(result).toEqual(expectedOutput);
  });

  test("should handle text without special characters", () => {
    const inputText = "This is plain text without special characters.";
    const expectedOutput = "This is plain text without special characters";
    const result = removeSpecialCharacters(inputText);
    expect(result).toEqual(expectedOutput);
  });

  test("should handle an empty input string", () => {
    const inputText = "";
    const expectedOutput = "";
    const result = removeSpecialCharacters(inputText);
    expect(result).toEqual(expectedOutput);
  });

  test("should handle text with special characters at the beginning and end", () => {
    const inputText = "!Special Text!";
    const expectedOutput = "Special Text";
    const result = removeSpecialCharacters(inputText);
    expect(result).toEqual(expectedOutput);
  });

  test("should handle text with special characters in the middle", () => {
    const inputText = "Text with $pecial characters";
    const expectedOutput = "Text with pecial characters";
    const result = removeSpecialCharacters(inputText);
    expect(result).toEqual(expectedOutput);
  });
});

describe("escapeMarkdownSpecialCharacters", () => {
  test("should escape underscore (_) character", () => {
    const inputText = "This_is_an_example";
    const expectedOutput = "This\\_is\\_an\\_example";
    const result = escapeMarkdownSpecialCharacters(inputText);
    expect(result).toEqual(expectedOutput);
  });

  test("should handle text without special characters", () => {
    const inputText = "This is plain text without special characters.";
    const expectedOutput = "This is plain text without special characters.";
    const result = escapeMarkdownSpecialCharacters(inputText);
    expect(result).toEqual(expectedOutput);
  });

  test("should handle an empty input string", () => {
    const inputText = "";
    const expectedOutput = "";
    const result = escapeMarkdownSpecialCharacters(inputText);
    expect(result).toEqual(expectedOutput);
  });

  test("should handle text with multiple underscore characters", () => {
    const inputText = "__Double__Underscores__";
    const expectedOutput = "\\_\\_Double\\_\\_Underscores\\_\\_";
    const result = escapeMarkdownSpecialCharacters(inputText);
    expect(result).toEqual(expectedOutput);
  });

  test("should not escape other special characters", () => {
    const inputText = "This is $pecial [Text].";
    const expectedOutput = "This is $pecial [Text].";
    const result = escapeMarkdownSpecialCharacters(inputText);
    expect(result).toEqual(expectedOutput);
  });
});