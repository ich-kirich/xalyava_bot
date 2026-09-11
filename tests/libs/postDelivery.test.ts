import TelegramBot from "node-telegram-bot-api";
import { getUsersForMailing, updateTodayPost } from "../../src/services/botServices";
import { getPostsFromWebsite } from "../../src/libs/parsingSite";
import { sendingPosts } from "../../src/libs/sendingPosts";

jest.mock("../../src/libs/parsingSite");
jest.mock("../../src/services/botServices");

describe("sendingPosts mailing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should send a sorry message if there are no posts", async () => {
    const bot = {
      sendMediaGroup: jest.fn(),
      sendMessage: jest.fn(),
    } as unknown as TelegramBot;
    (getPostsFromWebsite as jest.Mock).mockResolvedValue([]);
    (getUsersForMailing as jest.Mock).mockResolvedValue([1, 2, 3]);
    await sendingPosts(bot);
    expect(getPostsFromWebsite).toHaveBeenCalledTimes(1);
    expect(getUsersForMailing).toHaveBeenCalledTimes(1);
    expect(updateTodayPost).not.toHaveBeenCalled();
    expect(bot.sendMessage).toHaveBeenCalledTimes(3);
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
        imagesArray: ["image1", "image2"],
      },
      {
        postId: 2,
        postText: "text",
        imagesArray: ["image1", "image2"],
      },
    ];
    (getPostsFromWebsite as jest.Mock).mockResolvedValue(posts);
    (getUsersForMailing as jest.Mock).mockResolvedValue([1, 2, 3]);
    await sendingPosts(bot);
    expect(getPostsFromWebsite).toHaveBeenCalledTimes(1);
    expect(getUsersForMailing).toHaveBeenCalledTimes(1);
    expect(updateTodayPost).toHaveBeenCalledWith({
      postId: 1,
      postText: "text",
      imagesArray: ["image1", "image2"],
    });
    expect(bot.sendMediaGroup).toHaveBeenCalledTimes(posts.length * 3);
  });

  test("should keep mailing if today post cannot be saved", async () => {
    const bot = {
      sendMediaGroup: jest.fn(),
      sendMessage: jest.fn(),
    } as unknown as TelegramBot;
    const posts = [
      {
        postId: 1,
        postText: "text",
        imagesArray: ["image1", "image2"],
      },
    ];
    (getPostsFromWebsite as jest.Mock).mockResolvedValue(posts);
    (getUsersForMailing as jest.Mock).mockResolvedValue([1]);
    (updateTodayPost as jest.Mock).mockRejectedValue(new Error("too long"));
    await sendingPosts(bot);
    expect(bot.sendMediaGroup).toHaveBeenCalledTimes(1);
    expect(bot.sendMessage).toHaveBeenCalledTimes(1);
  });
});
