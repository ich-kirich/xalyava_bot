import config from "config";
import sequelize from "../../src/db";
import logger from "../../src/libs/logger";
import initDb from "../../src/models/initDb";

describe("initDb", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("should authenticate with the database", async () => {
    const authenticateSpy = jest
      .spyOn(sequelize, "authenticate")
      .mockResolvedValue(undefined as never);
    await initDb();
    expect(authenticateSpy).toHaveBeenCalled();
  });

  test("should log a successful database connection", async () => {
    jest
      .spyOn(sequelize, "authenticate")
      .mockResolvedValue(undefined as never);
    const loggerSpy = jest.spyOn(logger, "info");
    await initDb();
    expect(loggerSpy).toHaveBeenCalledWith(
      "Database connection established successfully",
    );
  });

  test("should retry authenticate after a failed attempt", async () => {
    const originalGet = config.get.bind(config);
    jest.spyOn(config, "get").mockImplementation((key: string) => {
      if (key === "db.retryAttempts") {
        return 3;
      }
      if (key === "db.retryDelayMs") {
        return 0;
      }
      return originalGet(key);
    });
    const authenticateSpy = jest
      .spyOn(sequelize, "authenticate")
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(undefined as never);
    await initDb();
    expect(authenticateSpy).toHaveBeenCalledTimes(2);
  });
});

afterAll(() => {
  sequelize.close();
});
