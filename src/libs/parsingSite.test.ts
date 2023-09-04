import { addVideoLinks, fixMarkdown } from "./parsingSite";
import {
  escapeMarkdownSpecialCharacters,
  removeSpecialCharacters,
} from "./utils";

describe("addVideoLinks", () => {
  test("should add video links to postText", () => {
    const postText = "This is a post.";
    const linksVideos = ["video1", "video2"];
    const expectedResult = "This is a post.\n\nvideo1\nvideo2";
    const result = addVideoLinks(postText, linksVideos);
    expect(result).toEqual(expectedResult);
  });

  test("should handle an empty linksVideos array", () => {
    const postText = "This is a post.";
    const linksVideos: string[] = [];
    const expectedResult = "This is a post.\n\n";
    const result = addVideoLinks(postText, linksVideos);
    expect(result).toEqual(expectedResult);
  });

  test("should handle an empty postText", () => {
    const postText = "";
    const linksVideos = ["video1", "video2"];
    const expectedResult = "\n\nvideo1\nvideo2";
    const result = addVideoLinks(postText, linksVideos);
    expect(result).toEqual(expectedResult);
  });

  test("should handle both empty postText and linksVideos", () => {
    const postText = "";
    const linksVideos: string[] = [];
    const expectedResult = "\n\n";
    const result = addVideoLinks(postText, linksVideos);
    expect(result).toEqual(expectedResult);
  });
});

describe("fixMarkdown", () => {
  test("should remove bold formatting", () => {
    const inputText = "This is **bold** text.";
    const expectedOutput = "This is bold text.";
    const result = fixMarkdown(inputText);
    expect(result).toEqual(expectedOutput);
  });

  test("should escape Markdown asterisks", () => {
    const inputText = "This *is* some *text*.";
    const expectedOutput = "This \\*is\\* some \\*text\\*.";
    const result = fixMarkdown(inputText);
    expect(result).toEqual(expectedOutput);
  });

  test("should remove escaped closing brackets", () => {
    const inputText = "This is a \\] bracket.";
    const expectedOutput = "This is a ] bracket.";
    const result = fixMarkdown(inputText);
    expect(result).toEqual(expectedOutput);
  });

  test("should add spaces to Markdown links", () => {
    const inputText = "[link1](url1)[link2](url2)";
    const expectedOutput = " [link1](url1)  [link2](url2) ";
    const result = fixMarkdown(inputText);
    expect(result).toEqual(expectedOutput);
  });

  test("should handle an empty input string", () => {
    const inputText = "";
    const expectedOutput = "";
    const result = fixMarkdown(inputText);
    expect(result).toEqual(expectedOutput);
  });

  test("should handle a string without Markdown formatting", () => {
    const inputText = "This is a plain text.";
    const expectedOutput = "This is a plain text.";
    const result = fixMarkdown(inputText);
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
