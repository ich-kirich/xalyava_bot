import axios from "axios";
import { updatePosts } from "../../src/services/botServices";
import { getPostsFromWebsite } from "../../src/libs/parsingSite";

jest.mock("axios");
jest.mock("../../src/services/botServices");
jest.mock("../../src/libs/utils", () => ({
  ...jest.requireActual("../../src/libs/utils"),
  sleep: jest.fn().mockResolvedValue(undefined),
}));

function story(id: number): string {
  return `
    <article class="story" data-story-id="${id}">
      <a class="story__title-link" href="https://example.com/${id}">Post Title ${id}</a>
      <div class="story__content-inner">
        <p>Giveaway ${id}</p>
        <div class="story-image__image" data-src="https://example.com/pic${id}.jpg"></div>
        <div class="player" data-source="https://cdn.example.com/video_${id}.mp4"></div>
      </div>
    </article>
  `;
}

describe("getPostsFromWebsite assembly", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("builds markdown text, images and video links for new posts", async () => {
    (axios.get as jest.Mock)
      .mockResolvedValueOnce({
        status: 200,
        data: Buffer.from(story(1)),
        headers: {},
      })
      .mockResolvedValueOnce({
        status: 200,
        data: Buffer.from(""),
        headers: {},
      });
    (updatePosts as jest.Mock).mockResolvedValue([1]);

    const posts = await getPostsFromWebsite("https://example.com/community");

    expect(posts).toHaveLength(1);
    expect(posts[0].postId).toBe(1);
    expect(posts[0].imagesArray).toEqual(["https://example.com/pic1.jpg"]);
    expect(posts[0].postText).toContain(
      "[Post Title 1](https://example.com/1)",
    );
    expect(posts[0].postText).toContain("Giveaway 1");
    expect(posts[0].postText).toContain("https://cdn.example.com/video\\_1.mp4");
    expect(posts[0].postText).not.toContain("story-image__image");
  });
});
