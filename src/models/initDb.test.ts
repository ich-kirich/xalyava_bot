import sequelize from "../db";
import logger from "../libs/logger";
import initDb from "./initDb";


describe("initDb", () => {
  test("should authenticate with the database", async () => {
    const authenticateSpy = jest.spyOn(sequelize, "authenticate");
    await initDb();
    expect(authenticateSpy).toHaveBeenCalled();
  });

  test("should log a successful database connection", async () => {
    const loggerSpy = jest.spyOn(logger, "info");
    await initDb();
    expect(loggerSpy).toHaveBeenCalledWith(
      "Database connection established successfully",
    );
  });
});

afterAll(()=> {
  sequelize.close();
})
