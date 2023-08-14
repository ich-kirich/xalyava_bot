import logger from "../src/libs/logger";
import sequelize from "../src/db";

const initDb = async (): Promise<void> => {
  await sequelize.authenticate();
  logger.info("Database connection established successfully");
  return;
};

export default initDb;
