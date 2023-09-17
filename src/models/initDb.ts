import logger from "../libs/logger";
import sequelize from "../db";
import config from "config";
import ApiError from "../error/apiError";

const initDb = async (): Promise<void> => {
  console.log(config.get("db.database"));
  console.log(config.get("db.username"));
  console.log(config.get("db.password"));
  console.log(config.get("db.dialect"));
  console.log(config.get("db.host"));
  console.log(config.get("db.port"));
  try {
    await sequelize.authenticate();
  } catch(e) {
    logger.error("Db error", new ApiError(e.status, e.message));
  }
  logger.info("Database connection established successfully");
  return;
};

export default initDb;
