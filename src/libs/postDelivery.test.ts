import TelegramBot from "node-telegram-bot-api";
import { getUsersForMailing, updateTodayPost } from "../services/botServices";
import getPostsFromWebsite from "./getPostsFromWebsite";
import { postDelivery } from "./postDelivery";
import { sendPost, sendSorryMessage } from "./sendingPosts";

jest.mock("./parsingSite");
jest.mock("./getPostsFromWebsite");
jest.mock("./sendingPosts");
jest.mock("../services/botServices");

beforeEach(() => {
  (getPostsFromWebsite as jest.Mock).mockClear();
  (getUsersForMailing as jest.Mock).mockClear();
});

describe("postDelivery", () => {
  test("should send a sorry message if there are no posts", async () => {
    const bot = {
      sendMediaGroup: jest.fn(),
      sendMessage: jest.fn(),
    } as unknown as TelegramBot;
    (getPostsFromWebsite as jest.Mock).mockReturnValue([]);
    (getUsersForMailing as jest.Mock).mockReturnValue([1, 2, 3]);
    await postDelivery(bot);
    expect(getPostsFromWebsite).toHaveBeenCalledTimes(1);
    expect(getUsersForMailing).toHaveBeenCalledTimes(1);
    expect(sendSorryMessage).toHaveBeenCalledWith(bot, [1, 2, 3]);
  });

  test("should send posts if there are posts", async () => {
    const bot = {
      sendMediaGroup: jest.fn(),
      sendMessage: jest.fn(),
    } as unknown as TelegramBot;
    const posts = [
      {
        postId: 1,
        postText: "text",
        imagesArray: ["images"],
      },
      {
        postId: 2,
        postText: "text",
        imagesArray: ["images"],
      },
    ];
    (getPostsFromWebsite as jest.Mock).mockReturnValue(posts);
    await postDelivery(bot);
    expect(getPostsFromWebsite).toHaveBeenCalledTimes(1);
    expect(getUsersForMailing).toHaveBeenCalledTimes(1);
    expect(updateTodayPost).toHaveBeenCalledWith({
      postId: 1,
      postText: "text",
      imagesArray: ["images"],
    });
    expect(sendPost).toHaveBeenCalledTimes(posts.length);
  });
});
