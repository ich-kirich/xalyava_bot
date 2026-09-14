import {
  getBotCommands,
  getBotDescription,
  getBotShortDescription,
  getHelloMessage,
  linkSite,
} from "../../src/libs/constants";

describe("bot public texts", () => {
  test("hello message lists commands and the source site", () => {
    const hello = getHelloMessage();
    expect(hello).toContain(linkSite);
    expect(hello).toContain("/startxalyava");
    expect(hello).toContain("/stopxalyava");
  });

  test("fits Telegram description limits", () => {
    expect(getBotShortDescription().length).toBeLessThanOrEqual(120);
    expect(getBotDescription().length).toBeLessThanOrEqual(512);
    for (const command of getBotCommands()) {
      expect(command.description.length).toBeLessThanOrEqual(256);
    }
  });
});
