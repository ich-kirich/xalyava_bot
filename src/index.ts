import TelegramBot from "node-telegram-bot-api";
import config from "config";
import BotControllers from "./controllers/botControllers";
import { StatusCodes } from "http-status-codes";
import ApiError from "./error/apiError";
import initDb from "../models/initDb";

const startServer = async () => {
  try {
    const bot = new TelegramBot(config.get("telegram.apiKey"), {
      polling: true,
    });
    BotControllers.messagesToBot(bot);
    await initDb();
    console.log("The bot is up and running");
  } catch (e) {
    console.log(
      new ApiError(e.status || StatusCodes.INTERNAL_SERVER_ERROR, e.message),
    );
  }
};

startServer();
