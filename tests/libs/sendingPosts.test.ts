import TelegramBot from "node-telegram-bot-api";
import { sendPost } from "../../src/libs/sendingPosts";

describe("sendPost", () => {
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

  test("stops the mailing after the first chat fails", async () => {
    const sendMediaGroup = jest.fn().mockRejectedValue(new Error("blocked"));
    const sendMessage = jest.fn();
    const bot = {
      sendMediaGroup,
      sendPhoto: jest.fn(),
      sendMessage,
    } as unknown as TelegramBot;
    const postContent = {
      postId: 1,
      imagesArray: ["image1.jpg", "image2.jpg"],
      postText: "This is a post",
    };

    await expect(sendPost(bot, postContent, [10, 20])).rejects.toThrow(
      "blocked",
    );
    expect(sendMediaGroup).toHaveBeenCalledTimes(1);
    expect(sendMediaGroup).toHaveBeenCalledWith(10, expect.any(Array));
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
