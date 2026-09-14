import { updatePosts } from "../../src/services/botServices";
import { getPosts } from "../../src/libs/parsingSite";

jest.mock("../../src/services/botServices");

function story(
  id: number,
  inner = `<p>Content ${id}</p>`,
): string {
  return `
    <article class="story" data-story-id="${id}">
      <a class="story__title-link" href="https://example.com/${id}">
        Post ${id}
      </a>
      <div class="story__content-inner">${inner}</div>
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

describe("getPosts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("extracts content-inner, videos and skips ads and already stored posts", async () => {
    const html = [
      advertisement,
      story(
        1,
        `
          <p>Giveaway 1</p>
          <div class="player" data-source="video1"></div>
        `,
      ),
      story(2, "<p>Giveaway 2</p>"),
    ].join("");
    (updatePosts as jest.Mock).mockResolvedValue([1]);

    const posts = await getPosts(html);

    expect(updatePosts).toHaveBeenCalledWith([1, 2]);
    expect(posts).toHaveLength(1);
    expect(posts[0].postId).toBe(1);
    expect(posts[0].postBlock).toContain("story__title-link");
    expect(posts[0].postContent).toContain("Giveaway 1");
    expect(posts[0].postContent).toContain('data-source="video1"');
    expect(posts[0].postContent).not.toContain("story__title-link");
    expect(posts[0].linksVideos).toEqual(["video1"]);
  });
});
