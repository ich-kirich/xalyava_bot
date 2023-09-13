import TelegramBot from "node-telegram-bot-api";
import ApiError from "../error/apiError";
import { MESSAGES } from "./constants";
import { sendPost, sendSorryMessage } from "./sendingPosts";

jest.mock("./parsingSite");
jest.mock("../services/botServices");

describe("sendSorryMessage", () => {
  test("should send a message to each chat id", async () => {
    const bot = {
      sendMessage: jest.fn(),
    } as unknown as TelegramBot;
    const chatsIds = [1, 2, 3];
    await sendSorryMessage(bot, chatsIds);
    expect(bot.sendMessage).toHaveBeenCalledTimes(chatsIds.length);
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chatsIds[0],
      MESSAGES.NO_NEW_POSTS,
    );
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chatsIds[1],
      MESSAGES.NO_NEW_POSTS,
    );
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chatsIds[2],
      MESSAGES.NO_NEW_POSTS,
    );
  });

  test("should throw an error if sendMessage fails", async () => {
    const bot = {
      sendMessage: jest
        .fn()
        .mockRejectedValue(new Error("Failed to send message")),
    } as unknown as TelegramBot;
    const chatsIds = [1, 2, 3];
    await expect(sendSorryMessage(bot, chatsIds)).rejects.toThrow(
      new ApiError(500, "Failed to send message"),
    );
  });
});

describe("sendPost", () => {
  test("should send a post to each chat id", async () => {
    const bot = {
      sendMediaGroup: jest.fn(),
      sendMessage: jest.fn(),
    } as unknown as TelegramBot;
    const postContent = {
      postId: 1,
      imagesArray: ["image1.jpg", "image2.jpg"],
      postText: "This is a post",
    };
    const chatsIds = [1, 2];
    await sendPost(bot, postContent, chatsIds);
    expect(bot.sendMediaGroup).toHaveBeenCalledTimes(chatsIds.length);
    expect(bot.sendMediaGroup).toHaveBeenCalledWith(
      chatsIds[0],
      expect.arrayContaining([
        expect.objectContaining({ type: "photo", media: "image1.jpg" }),
        expect.objectContaining({ type: "photo", media: "image2.jpg" }),
      ]),
    );
    expect(bot.sendMediaGroup).toHaveBeenCalledWith(
      chatsIds[1],
      expect.arrayContaining([
        expect.objectContaining({ type: "photo", media: "image1.jpg" }),
        expect.objectContaining({ type: "photo", media: "image2.jpg" }),
      ]),
    );
    expect(bot.sendMessage).toHaveBeenCalledTimes(chatsIds.length);
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chatsIds[0],
      "This is a post",
      {
        disable_web_page_preview: true,
        parse_mode: "Markdown",
      },
    );
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chatsIds[1],
      "This is a post",
      {
        disable_web_page_preview: true,
        parse_mode: "Markdown",
      },
    );
  });

  test("should throw an error if sendMediaGroup fails", async () => {
    const bot = {
      sendMediaGroup: jest
        .fn()
        .mockRejectedValue(new Error("Failed to send media")),
      sendMessage: jest.fn(),
    } as unknown as TelegramBot;
    const postContent = {
      postId: 1,
      imagesArray: ["image1.jpg", "image2.jpg"],
      postText: "This is a post",
    };
    const chatsIds = [1, 2, 3];
    await expect(sendPost(bot, postContent, chatsIds)).rejects.toThrow(
      new ApiError(500, "Failed to send media"),
    );
  });

  test("should throw an error if sendMessage fails", async () => {
    const bot = {
      sendMediaGroup: jest.fn(),
      sendMessage: jest
        .fn()
        .mockRejectedValue(new Error("Failed to send message")),
    } as unknown as TelegramBot;
    const postContent = {
      postId: 1,
      imagesArray: ["image1.jpg", "image2.jpg"],
      postText: "This is a post",
    };
    const chatsIds = [1, 2, 3];
    await expect(sendPost(bot, postContent, chatsIds)).rejects.toThrow(
      new ApiError(500, "Failed to send message"),
    );
  });
});
