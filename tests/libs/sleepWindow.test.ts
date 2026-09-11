import config from "config";
import {
  getSleepDelayHint,
  getSleepWindow,
} from "../../src/libs/sleepWindow";
import {
  getBotCommands,
  getBotDescription,
  getBotShortDescription,
  getHelloMessage,
} from "../../src/libs/constants";

describe("sleep delay copy", () => {
  test("reads window from config", () => {
    expect(getSleepWindow()).toEqual({
      start: String(config.get("sleep.start")),
      end: String(config.get("sleep.end")),
      timezone: String(config.get("sleep.timezone")),
    });
  });

  test("includes configured hours in all public texts", () => {
    const hint = getSleepDelayHint();
    expect(hint).toContain(String(config.get("sleep.start")));
    expect(hint).toContain(String(config.get("sleep.end")));
    expect(hint).toContain(String(config.get("sleep.timezone")));
    expect(getHelloMessage()).toContain(hint);
    expect(getBotDescription()).toContain(hint);
    expect(getBotShortDescription()).toContain(hint);
    expect(getBotShortDescription().length).toBeLessThanOrEqual(120);
    expect(getBotDescription().length).toBeLessThanOrEqual(512);
    for (const command of getBotCommands()) {
      expect(command.description).toContain(hint);
      expect(command.description.length).toBeLessThanOrEqual(256);
    }
  });
});
