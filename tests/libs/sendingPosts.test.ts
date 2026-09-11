import TelegramBot from "node-telegram-bot-api";
import ApiError from "../../src/error/apiError";
import { MESSAGES } from "../../src/libs/constants";
import { sendPost, sendSorryMessage } from "../../src/libs/sendingPosts";

jest.mock("../../src/libs/parsingSite");
jest.mock("../../src/services/botServices");

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

  test("should split a long post into several messages", async () => {
    const sendMessage = jest.fn();
    const bot = {
      sendMediaGroup: jest.fn(),
      sendPhoto: jest.fn(),
      sendMessage,
    } as unknown as TelegramBot;
    const postContent = {
      postId: 1,
      imagesArray: ["image1.jpg"],
      postText: `${"a".repeat(4000)}\n${"b".repeat(4000)}`,
    };
    await sendPost(bot, postContent, [1]);
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(String(sendMessage.mock.calls[0][1]).length).toBeLessThanOrEqual(
      4096,
    );
    expect(String(sendMessage.mock.calls[1][1]).length).toBeLessThanOrEqual(
      4096,
    );
  });

  test("should split more than 10 images into several albums", async () => {
    const sendMediaGroup = jest.fn();
    const bot = {
      sendMediaGroup,
      sendPhoto: jest.fn(),
      sendMessage: jest.fn(),
    } as unknown as TelegramBot;
    const postContent = {
      postId: 1,
      imagesArray: Array.from({ length: 12 }, (_, i) => `image${i + 1}.jpg`),
      postText: "This is a post",
    };

    await sendPost(bot, postContent, [1]);

    expect(sendMediaGroup).toHaveBeenCalledTimes(2);
    expect(sendMediaGroup.mock.calls[0][1]).toHaveLength(10);
    expect(sendMediaGroup.mock.calls[1][1]).toHaveLength(2);
    expect(sendMediaGroup.mock.calls[1][1][0]).toEqual({
      type: "photo",
      media: "image11.jpg",
    });
  });

  test("should send a single leftover image as a photo", async () => {
    const sendMediaGroup = jest.fn();
    const sendPhoto = jest.fn();
    const bot = {
      sendMediaGroup,
      sendPhoto,
      sendMessage: jest.fn(),
    } as unknown as TelegramBot;
    const postContent = {
      postId: 1,
      imagesArray: Array.from({ length: 11 }, (_, i) => `image${i + 1}.jpg`),
      postText: "This is a post",
    };

    await sendPost(bot, postContent, [1]);

    expect(sendMediaGroup).toHaveBeenCalledTimes(1);
    expect(sendPhoto).toHaveBeenCalledWith(1, "image11.jpg");
  });
});

describe("sendingPosts", () => {
  test("should send a sorry message when there are no new posts", async () => {
    const bot = {
      sendMessage: jest.fn(),
    } as unknown as TelegramBot;
    const parsingSite = jest.requireMock("../../src/libs/parsingSite") as {
      getPostsFromWebsite: jest.Mock;
    };
    const botServices = jest.requireMock("../../src/services/botServices") as {
      getUsersForMailing: jest.Mock;
      updateTodayPost: jest.Mock;
    };
    parsingSite.getPostsFromWebsite.mockResolvedValue([]);
    botServices.getUsersForMailing.mockResolvedValue([1, 2]);
    const { sendingPosts } = await import("../../src/libs/sendingPosts");
    await sendingPosts(bot);
    expect(botServices.getUsersForMailing).toHaveBeenCalled();
    expect(botServices.updateTodayPost).not.toHaveBeenCalled();
    expect(bot.sendMessage).toHaveBeenCalledTimes(2);
  });
});
