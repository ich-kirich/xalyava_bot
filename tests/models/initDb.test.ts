import config from "config";
import sequelize from "../../src/db";
import initDb from "../../src/models/initDb";

describe("initDb", () => {
  afterEach(() => {
    jest.restoreAllMocks();
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
