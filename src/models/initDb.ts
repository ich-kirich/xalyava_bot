import config from "config";
import logger from "../libs/logger";
import sequelize from "../db";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const initDb = async (): Promise<void> => {
  const attempts = Number(config.get("db.retryAttempts"));
  const delayMs = Number(config.get("db.retryDelayMs"));
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await sequelize.authenticate();
      logger.info("Database connection established successfully");
      return;
    } catch (e) {
      lastError = e;
      logger.error(
        `Database connection attempt ${attempt}/${attempts} failed: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      if (attempt < attempts) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
};

export default initDb;
