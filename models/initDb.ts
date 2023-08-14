import sequelize from "../src/db";

const initDb = async (): Promise<void> => {
  await sequelize.authenticate();
  console.log("Connection to the database has been made");
  return;
};

export default initDb;
