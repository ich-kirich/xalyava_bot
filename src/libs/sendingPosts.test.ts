import TelegramBot from "node-telegram-bot-api";
import ApiError from "../error/apiError";
import { MESSAGES } from "./constants";
import { sendingPosts, sendPost, sendSorryMessage } from "./sendingPosts";
import { getPostsFromWebsite } from "./parsingSite";
import { getUsersForMailing, updateTodayPost } from "../services/botServices";

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

describe("sendingPosts", () => {
  it("should send a sorry message if there are no posts", async () => {
    const bot = {
      sendMediaGroup: jest.fn(),
      sendMessage: jest.fn(),
    } as unknown as TelegramBot;
    (getPostsFromWebsite as jest.Mock).mockReturnValue([]);
    (getUsersForMailing as jest.Mock).mockReturnValue([1, 2, 3]);
    await sendingPosts(bot);
    expect(getPostsFromWebsite).toHaveBeenCalledTimes(1);
    expect(getUsersForMailing).toHaveBeenCalledTimes(1);
    expect(sendSorryMessage).toHaveBeenCalledWith(bot, [1, 2, 3]); // Как мне это замокать, чтобы не ломались остальные тесты?
  });

  // it('should throw an error if there are no users to mail', async () => {
  //   const bot = {
  //     sendMediaGroup: jest.fn(),
  //     sendMessage: jest.fn(),
  //   };
  //   const getPostsFromWebsiteSpy = jest.spyOn(yourModule, 'getPostsFromWebsite').mockResolvedValue([
  //     {
  //       imagesArray: ['image1.jpg', 'image2.jpg'],
  //       postText: 'This is a post',
  //     },
  //   ]);
  //   const updateTodayPostSpy = jest.spyOn(yourModule, 'updateTodayPost').mockResolvedValue(undefined);
  //   const getUsersForMailingSpy = jest.spyOn(yourModule, 'getUsersForMailing').mockResolvedValue([]);
  //   const sendSorryMessageSpy = jest.spyOn(yourModule, 'sendSorryMessage').mockResolvedValue(undefined);
  //   const sendPostSpy = jest.spyOn(yourModule, 'sendPost').mockResolvedValue(undefined);
  //   await expect(sendingPosts(bot)).rejects.toThrow();
  //   expect(getPostsFromWebsiteSpy).toHaveBeenCalledTimes(1);
  //   expect(updateTodayPostSpy).not.toHaveBeenCalled();
  //   expect(getUsersForMailingSpy).toHaveBeenCalledTimes(1);
  //   expect(sendSorryMessageSpy).not.toHaveBeenCalled();
  //   expect(sendPostSpy).not.toHaveBeenCalled();
  // });
});
