import logger from "../libs/logger";
import sequelize from "../db";

const initDb = async (): Promise<void> => {
  await sequelize.sync();
  logger.info("Database connection established successfully");
  return;
};

export default initDb;
