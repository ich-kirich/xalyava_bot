import { Op } from "sequelize";
import AppLog from "../../src/models/appLog";
import ApiError from "../../src/error/apiError";
import {
  LOG_MESSAGE_MAX,
  LOG_RETENTION_DAYS,
  LOG_STACK_MAX,
} from "../../src/libs/constants";
import {
  PostgresLogTransport,
  clipLogText,
  enableAppLogPersistence,
  parseBeforeId,
  parseLogLevel,
  parseLogLimit,
  persistAppLog,
  pruneAppLogs,
  queryAppLogs,
  queuedAppLogsForTests,
  resetAppLogPersistenceForTests,
  serializeLogMeta,
} from "../../src/libs/appLogStore";

jest.mock("../../src/models/appLog", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    destroy: jest.fn(),
    findAll: jest.fn(),
  },
}));

describe("appLogStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAppLogPersistenceForTests();
  });

  test("persistAppLog ignores info and warn and queues error until the database is ready", async () => {
    persistAppLog("info", "skip me", null);
    persistAppLog("warn", "skip warn", null);
    persistAppLog("error", "keep me", { status: 1 });

    expect(AppLog.create).not.toHaveBeenCalled();
    expect(queuedAppLogsForTests()).toEqual([
      { level: "error", message: "keep me", meta: { status: 1 } },
    ]);

    (AppLog.create as jest.Mock).mockResolvedValue({});
    await enableAppLogPersistence();

    expect(AppLog.create).toHaveBeenCalledWith({
      level: "error",
      message: "keep me",
      meta: { status: 1 },
    });
    expect(queuedAppLogsForTests()).toEqual([]);
  });

  test("persistAppLog swallows a failed insert", async () => {
    (AppLog.create as jest.Mock).mockRejectedValue(new Error("db down"));
    await enableAppLogPersistence();

    expect(() => persistAppLog("error", "boom", null)).not.toThrow();
    await Promise.resolve();
    expect(AppLog.create).toHaveBeenCalledWith({
      level: "error",
      message: "boom",
      meta: null,
    });
  });

  test("persistAppLog skips a repeated error within the dedup window", async () => {
    (AppLog.create as jest.Mock).mockResolvedValue({});
    await enableAppLogPersistence();

    persistAppLog("error", "same", null);
    persistAppLog("error", "same", null);
    await Promise.resolve();

    expect(AppLog.create).toHaveBeenCalledTimes(1);
  });

  test("clipLogText keeps rows short", () => {
    expect(clipLogText("ok", 4)).toBe("ok");
    expect(clipLogText("abcdef", 4)).toBe("abc…");
    expect(
      clipLogText("x".repeat(LOG_MESSAGE_MAX + 10), LOG_MESSAGE_MAX).length,
    ).toBe(LOG_MESSAGE_MAX);
  });

  test("postgres transport writes error and skips info and warn", async () => {
    const transport = new PostgresLogTransport();
    (AppLog.create as jest.Mock).mockResolvedValue({});
    await enableAppLogPersistence();

    transport.log({ level: "info", message: "not stored" }, () => undefined);
    transport.log(
      { level: "warn", message: "not stored warn" },
      () => undefined,
    );
    transport.log(
      {
        level: "error",
        message: "stored error",
        [Symbol.for("splat")]: [new ApiError(500, "failed")],
      },
      () => undefined,
    );
    await Promise.resolve();

    expect(AppLog.create).toHaveBeenCalledTimes(1);
    expect(AppLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "error",
        message: "stored error",
        meta: expect.objectContaining({
          status: 500,
        }),
      }),
    );
  });

  test("pruneAppLogs deletes rows older than 90 days", async () => {
    const now = new Date("2026-09-15T12:00:00.000Z");
    (AppLog.destroy as jest.Mock).mockResolvedValue(2);

    await pruneAppLogs(now);

    const cutoff = (AppLog.destroy as jest.Mock).mock.calls[0][0].where
      .createdAt[Op.lt] as Date;
    expect(now.getTime() - cutoff.getTime()).toBe(
      LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
  });

  test("queryAppLogs returns a page for an admin list", async () => {
    (AppLog.findAll as jest.Mock).mockResolvedValue([
      {
        id: 9,
        level: "error",
        message: "boom",
        meta: { status: 500 },
        createdAt: new Date("2026-09-15T10:00:00.000Z"),
      },
    ]);

    await expect(
      queryAppLogs({ limit: 50, level: "error", beforeId: 20 }),
    ).resolves.toEqual({
      items: [
        {
          id: 9,
          level: "error",
          message: "boom",
          meta: { status: 500 },
          createdAt: new Date("2026-09-15T10:00:00.000Z"),
        },
      ],
      nextCursor: null,
    });
    expect(AppLog.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          level: "error",
          id: { [Op.lt]: 20 },
        },
        limit: 50,
      }),
    );
  });

  test("parseLogLimit and filters clamp to the allowed range", () => {
    expect(parseLogLimit(undefined)).toBe(50);
    expect(parseLogLimit("0")).toBe(50);
    expect(parseLogLimit("20")).toBe(20);
    expect(parseLogLimit("9999")).toBe(100);
    expect(parseLogLevel("error")).toBe("error");
    expect(parseLogLevel("info")).toBeUndefined();
    expect(parseBeforeId("12")).toBe(12);
    expect(parseBeforeId("nope")).toBeUndefined();
  });

  test("serializeLogMeta keeps a short stack and status", () => {
    const err = new ApiError(400, "bad payload");
    const meta = serializeLogMeta({
      level: "error",
      message: "Invalid Telegram webhook payload",
      [Symbol.for("splat")]: [err],
    });
    expect(meta?.status).toBe(400);
    expect(meta?.stack).toBe(clipLogText(err.stack ?? "", LOG_STACK_MAX));
    expect(meta).not.toHaveProperty("error");
  });
});
