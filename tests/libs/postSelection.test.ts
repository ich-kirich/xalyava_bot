import axios from "axios";
import { updatePosts } from "../../src/services/botServices";
import { FETCH_RETRY_DELAY_MS } from "../../src/libs/constants";
import { sleep } from "../../src/libs/utils";
import {
  getPosts,
  getPostsFromWebsite,
} from "../../src/libs/parsingSite";

jest.mock("axios");
jest.mock("../../src/services/botServices");
jest.mock("../../src/libs/utils", () => ({
  ...jest.requireActual("../../src/libs/utils"),
  sleep: jest.fn().mockResolvedValue(undefined),
}));

function story(id: number): string {
  return `
    <article class="story" data-story-id="${id}">
      <a class="story__title-link" href="https://example.com/${id}">
        Post ${id}
      </a>
      <div class="story__content-inner">Content ${id}</div>
    </article>
  `;
}

const advertisement = `
  <article class="story" data-story-id="999">
    <div class="story__main story__placeholder">
      <div id="adfox_d_feed_all_1_1_1"></div>
    </div>
  </article>
`;

describe("getPosts selection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("stores at most 10 real story ids and excludes advertisements", async () => {
    const html = [
      story(1),
      advertisement,
      ...Array.from({ length: 11 }, (_, index) => story(index + 2)),
    ].join("");
    (updatePosts as jest.Mock).mockResolvedValue([]);

    await getPosts(html);

    expect(updatePosts).toHaveBeenCalledWith([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  test("loads page 2 when page 1 has fewer than 10 real stories", async () => {
    const firstPage = [
      ...Array.from({ length: 8 }, (_, index) => story(index + 1)),
      advertisement,
    ].join("");
    const secondPage = [
      advertisement,
      ...Array.from({ length: 4 }, (_, index) => story(index + 9)),
    ].join("");
    (axios.get as jest.Mock)
      .mockResolvedValueOnce({
        status: 200,
        data: Buffer.from(firstPage),
        headers: {},
      })
      .mockResolvedValueOnce({
        status: 200,
        data: Buffer.from(secondPage),
        headers: {},
      });
    (updatePosts as jest.Mock).mockResolvedValue([]);

    await getPostsFromWebsite("https://example.com/community");

    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(axios.get).toHaveBeenLastCalledWith(
      "https://example.com/community?page=2",
      expect.any(Object),
    );
    expect(updatePosts).toHaveBeenCalledWith([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  test("retries a blocked page and then loads stories", async () => {
    const html = Array.from({ length: 10 }, (_, index) => story(index + 1)).join("");
    (axios.get as jest.Mock)
      .mockResolvedValueOnce({
        status: 403,
        data: Buffer.from("<title>DDoS-Guard</title>"),
        headers: {},
      })
      .mockResolvedValueOnce({
        status: 200,
        data: Buffer.from(html),
        headers: { "set-cookie": ["__ddg1=abc; Path=/"] },
      });
    (updatePosts as jest.Mock).mockResolvedValue([]);

    await getPostsFromWebsite("https://example.com/community");

    expect(sleep).toHaveBeenCalledWith(FETCH_RETRY_DELAY_MS);
    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(updatePosts).toHaveBeenCalledWith([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  test("reuses DDoS-Guard cookies on the second page request", async () => {
    const firstPage = story(1);
    const secondPage = story(2);
    (axios.get as jest.Mock)
      .mockResolvedValueOnce({
        status: 200,
        data: Buffer.from(firstPage),
        headers: { "set-cookie": ["__ddg1=abc; Path=/"] },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: Buffer.from(secondPage),
        headers: {},
      });
    (updatePosts as jest.Mock).mockResolvedValue([]);

    await getPostsFromWebsite("https://example.com/community");

    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      "https://example.com/community?page=2",
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: "__ddg1=abc",
        }),
      }),
    );
  });

  test("accepts a normal page that merely references the ddos-guard script", async () => {
    const html =
      '<script src="/.well-known/ddos-guard/check.js"></script>' +
      Array.from({ length: 10 }, (_, index) => story(index + 1)).join("");
    (axios.get as jest.Mock).mockResolvedValueOnce({
      status: 200,
      data: Buffer.from(html),
      headers: {},
    });
    (updatePosts as jest.Mock).mockResolvedValue([]);

    await getPostsFromWebsite("https://example.com/community");

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(updatePosts).toHaveBeenCalledWith([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  test("fails after three blocked attempts", async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      status: 403,
      data: Buffer.from("<title>DDoS-Guard</title>"),
      headers: {},
    });

    await expect(
      getPostsFromWebsite("https://example.com/community"),
    ).rejects.toThrow("Pikabu request blocked");
    expect(axios.get).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
