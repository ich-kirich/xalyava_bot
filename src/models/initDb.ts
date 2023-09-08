import logger from "../libs/logger";
import sequelize from "../db";

const initDb = async (): Promise<void> => {
  await sequelize.authenticate();
  logger.info("Database connection established successfully");
  return;
};

export default initDb;
