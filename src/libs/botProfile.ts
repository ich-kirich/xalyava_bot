import axios from "axios";
import config from "config";
import logger from "./logger";

async function postBotApi(method: string, payload: object): Promise<void> {
  const token = String(config.get("telegram.apiKey"));
  await axios.post(`https://api.telegram.org/bot${token}/${method}`, payload);
}

export async function setBotDescription(description: string): Promise<void> {
  try {
    await postBotApi("setMyDescription", { description });
    logger.info("Telegram bot description is set");
  } catch (e) {
    logger.error(
      `Error when setting the bot description: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }
}

export async function setBotShortDescription(
  shortDescription: string,
): Promise<void> {
  try {
    await postBotApi("setMyShortDescription", {
      short_description: shortDescription,
    });
    logger.info("Telegram bot short description is set");
  } catch (e) {
    logger.error(
      `Error when setting the bot short description: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }
}
