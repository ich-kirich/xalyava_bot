import axios from "axios";
import * as iconv from "iconv-lite";
import htmlToMd from "html-to-md";
import {
  getPosts,
  extractImages,
  deleteImages,
  fixMarkdown,
  addNamePost,
  addVideoLinks,
} from "./parsingSite";
import getPostsFromWebsite from "./getPostsFromWebsite";

jest.mock("axios");
jest.mock("iconv-lite");
jest.mock("html-to-md");
jest.mock("./parsingSite");

describe("getPostsFromWebsite", () => {
  const url = "https://example.com";
  test("should return an array of posts", async () => {
    const response = {
      data: Buffer.from("<html></html>", "binary"),
    };
    const ruHtml = "ruHtml";
    const posts = [
      {
        postId: 1,
        postContent: "<div></div>",
        postBlock: "<div></div>",
        linksVideos: ["video1", "video2"],
      },
    ];
    const imagesArray = ["image1", "image2"];
    const htmlWithOutImages = "<div></div>";
    const markdownText = "markdownText";
    const rightMarkdown = "rightMarkdown";
    const textWithName = "textWithName";
    const postText = "postText";
    const resultPosts = [
      {
        postId: 1,
        postText,
        imagesArray,
      },
    ];

    (axios.get as jest.Mock).mockResolvedValueOnce(response);
    (iconv.decode as jest.Mock).mockReturnValueOnce(ruHtml);
    (getPosts as jest.Mock).mockResolvedValueOnce(posts);
    (extractImages as jest.Mock).mockReturnValueOnce(imagesArray);
    (deleteImages as jest.Mock).mockReturnValueOnce(htmlWithOutImages);
    (htmlToMd as jest.Mock).mockReturnValueOnce(markdownText);
    (fixMarkdown as jest.Mock).mockReturnValueOnce(rightMarkdown);
    (addNamePost as jest.Mock).mockReturnValueOnce(textWithName);
    (addVideoLinks as jest.Mock).mockReturnValueOnce(postText);

    const result = await getPostsFromWebsite(url);

    expect(result).toEqual(resultPosts);
    expect(axios.get).toHaveBeenCalledWith(url, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
      responseType: "arraybuffer",
    });
    expect(iconv.decode).toHaveBeenCalledWith(response.data, "win1251");
    expect(getPosts).toHaveBeenCalledWith(ruHtml);
    expect(extractImages).toHaveBeenCalledWith(posts[0].postContent);
    expect(deleteImages).toHaveBeenCalledWith(posts[0].postContent);
    expect(htmlToMd).toHaveBeenCalledWith(htmlWithOutImages);
    expect(fixMarkdown).toHaveBeenCalledWith(markdownText);
    expect(addNamePost).toHaveBeenCalledWith(rightMarkdown, posts[0].postBlock);
    expect(addVideoLinks).toHaveBeenCalledWith(
      textWithName,
      posts[0].linksVideos,
    );
  });

  test("should throw an error if getPosts fails", async () => {
    const response = {
      data: Buffer.from("<html></html>", "binary"),
    };
    const ruHtml = "ruHtml";
    const error = new Error("getPosts error");

    (axios.get as jest.Mock).mockResolvedValueOnce(response);
    (iconv.decode as jest.Mock).mockReturnValueOnce(ruHtml);
    (getPosts as jest.Mock).mockRejectedValueOnce(error);

    await expect(getPostsFromWebsite(url)).rejects.toThrowError(error);
    expect(axios.get).toHaveBeenCalledWith(url, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
      responseType: "arraybuffer",
    });
    expect(iconv.decode).toHaveBeenCalledWith(response.data, "win1251");
    expect(getPosts).toHaveBeenCalledWith(ruHtml);
  });
});
