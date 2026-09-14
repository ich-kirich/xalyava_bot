import TelegramBot from "node-telegram-bot-api";
import { MESSAGES } from "../../src/libs/constants";
import {
  addNewUser,
  getTodayPost,
  startMailing,
  stopMailing,
} from "../../src/services/botServices";
import { sendPost } from "../../src/libs/sendingPosts";
import BotControllers from "../../src/controllers/botControllers";

jest.mock("../../src/services/botServices");
jest.mock("../../src/libs/sendingPosts");

type MessageHandler = (msg: {
  text?: string;
  chat: { id: number };
  from: { id: number };
}) => Promise<void>;

function listen(): {
  bot: TelegramBot;
  sendMessage: jest.Mock;
  handle: MessageHandler;
} {
  let handle: MessageHandler = async () => undefined;
  const sendMessage = jest.fn();
  const bot = {
    sendMessage,
    on: (_event: string, listener: MessageHandler) => {
      handle = listener;
    },
  } as unknown as TelegramBot;
  BotControllers.messagesToBot(bot);
  return { bot, sendMessage, handle };
}

describe("BotControllers commands", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("/start registers the user", async () => {
    const { sendMessage, handle } = listen();

    await handle({
      text: "/start",
      chat: { id: 10 },
      from: { id: 20 },
    });

    expect(sendMessage).toHaveBeenCalledWith(
      10,
      expect.stringContaining("/startxalyava"),
      { disable_web_page_preview: true },
    );
    expect(addNewUser).toHaveBeenCalledWith(20);
  });

  test("/startxalyava subscribes and sends today's post", async () => {
    const { bot, sendMessage, handle } = listen();
    const today = {
      postId: 7,
      postText: "today",
      imagesArray: ["https://example.com/a.jpg"],
    };
    (getTodayPost as jest.Mock).mockResolvedValue([{ dataValues: today }]);

    await handle({
      text: "/startxalyava",
      chat: { id: 10 },
      from: { id: 20 },
    });

    expect(startMailing).toHaveBeenCalledWith(20);
    expect(sendMessage).toHaveBeenCalledWith(10, MESSAGES.START_MAILING);
    expect(sendMessage).toHaveBeenCalledWith(10, MESSAGES.POST_DB);
    expect(sendPost).toHaveBeenCalledWith(bot, today, [10]);
  });

  test("/startxalyava subscribes even when there is no today post", async () => {
    const { sendMessage, handle } = listen();
    (getTodayPost as jest.Mock).mockResolvedValue([]);

    await handle({
      text: "/startxalyava",
      chat: { id: 10 },
      from: { id: 20 },
    });

    expect(startMailing).toHaveBeenCalledWith(20);
    expect(sendPost).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith(10, MESSAGES.NO_POST_DB);
  });

  test("/stopxalyava unsubscribes", async () => {
    const { sendMessage, handle } = listen();

    await handle({
      text: "/stopxalyava",
      chat: { id: 10 },
      from: { id: 20 },
    });

    expect(stopMailing).toHaveBeenCalledWith(20);
    expect(sendMessage).toHaveBeenCalledWith(10, MESSAGES.STOP_MAILING);
  });
});
