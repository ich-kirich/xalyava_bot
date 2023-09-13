import { updatePosts } from "../services/botServices";
import {
  addNamePost,
  addVideoLinks,
  deleteImages,
  extractImages,
  fixMarkdown,
  getLinksVideos,
  getPosts,
} from "./parsingSite";

jest.mock("axios");
jest.mock("../services/botServices");

let index = 0;

const text = jest.fn(() => {
  return "Post Title";
});

const remove = jest.fn();

const html = jest.fn(() => {
  return '<div class="block">PostBlock</div>';
});

const attr = jest.fn().mockImplementation((source: string) => {
  if (source == "data-source") {
    index++;
    return index % 2 ? "video1" : "video2";
  }
  if (source == "data-story-id") {
    index++;
    return index % 2 ? 1 : 2;
  }
  if (source == "data-src") {
    index++;
    return index % 2
      ? "https://example.com/image1.jpg"
      : "https://example.com/image2.jpg";
  }
  if (source === "href") {
    return "https://example.com/post";
  }
});

const each = jest.fn().mockImplementation((callback) => {
  callback();
  callback();
});

const toArray = jest.fn(() => {
  return {
    slice: () => {
      return [1, 2];
    },
  };
});

const cheerioMock = {
  html,
};

const loadCheerio = jest.fn().mockImplementation(() => {
  return {
    attr,
    each,
    toArray,
    remove,
    text,
    html,
  };
}); // Надо как-то объединть cheerioMock и loadCheerio и передать в load

jest.mock("cheerio", () => {
  return {
    load: jest.fn().mockImplementation(() => loadCheerio),
  };
});

describe("getLinksVideos", () => {
  test("should return video links from HTML", () => {
    const fakeHtml =
      '<div class="player" data-source="video1"></div><div class="player" data-source="video2"></div>';
    const videoLinks = getLinksVideos(fakeHtml);
    expect(videoLinks).toEqual(["video1", "video2"]);
  });
});

describe("getPosts", () => {
  test("should return an array of posts", async () => {
    const html =
      '<div class="story" data-story-id="1"></div><div class="story" data-story-id="2"></div>';
    (updatePosts as jest.Mock).mockReturnValue([1, 2]);
    const posts = await getPosts(html);
    expect(posts[0]).toEqual({
      postId: 1,
      postBlock: '<div class="block">PostBlock</div>',
      postContent: '<div class="block">PostBlock</div>',
      linksVideos: ["video2", "video1"],
    });
    expect(posts[1]).toEqual({
      postId: 2,
      postBlock: '<div class="block">PostBlock</div>',
      postContent: '<div class="block">PostBlock</div>',
      linksVideos: ["video1", "video2"],
    });
  });

  test("should return an empty array if there are no new posts", async () => {
    const html =
      '<div class="story" data-story-id="1"></div><div class="story" data-story-id="2"></div>';
    (updatePosts as jest.Mock).mockReturnValue([]);
    const result = await getPosts(html);
    expect(result).toHaveLength(0);
  });
});

describe("extractImages", () => {
  test("should return an array of image URLs", () => {
    const html =
      '<div class="story-image__image" data-src="https://example.com/image1.jpg"></div><div class="story-image__image" data-src="https://example.com/image2.jpg"></div>';
    const images = extractImages(html);
    expect(images).toHaveLength(2);
    expect(images[0]).toBe("https://example.com/image1.jpg");
    expect(images[1]).toBe("https://example.com/image2.jpg");
  });
});

// describe("deleteImages", () => {
//   test("should remove .story-image__image elements from HTML", () => {
//     const html =
//       '<div class="story-image__image"></div><div class="story__content"></div>';
//     const result = deleteImages(html);
//     expect(result).toEqual('<div class="story__content"></div>');
//   });
// });

describe("addNamePost", () => {
  it("should add the post title to the beginning of the text", () => {
    const markdownText = "This is the post content.";
    const html =
      '<div class="story__title"><a class="story__title-link" href="https://example.com/post">Post Title</a></div>';
    const result = addNamePost(markdownText, html);
    expect(result).toEqual(
      "[Post Title](https://example.com/post)\n\nThis is the post content.",
    );
  });
});

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
