import { updatePosts } from "../../src/services/botServices";
import {
  addNamePost,
  addVideoLinks,
  extractImages,
  getLinksVideos,
  getPosts,
} from "../../src/libs/parsingSite";

jest.mock("../../src/services/botServices");

function story(id: number, inner = `<p>Content ${id}</p>`): string {
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

describe("extractImages", () => {
  test("collects story images and carousel slides without duplicates", () => {
    const html = `
      <div class="story-block story-block_type_image">
        <img class="story-image__image" data-src="https://cs.pikabu.ru/cover.webp">
      </div>
      <div class="story-block story-block_type_carousel">
        <article class="carousel__item"><img data-src="https://cs.pikabu.ru/slide1.jpg"></article>
        <article class="carousel__item"><img data-src="https://cs.pikabu.ru/slide2.jpg"></article>
        <article class="carousel__item"><img data-src="https://cs.pikabu.ru/cover.webp"></article>
        <div class="carousel__cur-slide">1/5</div>
      </div>
    `;

    expect(extractImages(html)).toEqual([
      "https://cs.pikabu.ru/cover.webp",
      "https://cs.pikabu.ru/slide1.jpg",
      "https://cs.pikabu.ru/slide2.jpg",
    ]);
  });
});

describe("getLinksVideos", () => {
  test("prefers player mp4 over hidden video page links", () => {
    expect(
      getLinksVideos(`
        <div data-role="player">
          <source src="https://cs17.pikabu.ru/game_low.mp4" type="video/mp4">
        </div>
        <a href="https://pikabu.ru/video/story/test/1">Перейти к видео</a>
        <div class="player" data-source="https://cdn.example.com/legacy.mp4"></div>
      `),
    ).toEqual([
      "https://cs17.pikabu.ru/game_low.mp4",
      "https://cdn.example.com/legacy.mp4",
    ]);
  });
});

describe("addNamePost", () => {
  test("puts a bold title without a pikabu link", () => {
    const html = `
      <a class="story__title-link" href="https://pikabu.ru/story/crystal_crisis">
        Crystal Crisis — 100% скидка в STEAM!
      </a>
    `;

    expect(addNamePost("Текст поста", html)).toBe(
      "<b>Crystal Crisis — 100% скидка в STEAM!</b>\n\nТекст поста",
    );
  });
});

describe("addVideoLinks", () => {
  test("appends the videos that are missing in the text", () => {
    expect(
      addVideoLinks("Текст", [
        "https://cs2.pikabu.ru/one.mp4",
        "https://cs17.pikabu.ru/two.mp4",
      ]),
    ).toBe(
      "Текст\n\n" +
        '<a href="https://cs2.pikabu.ru/one.mp4">Видео</a>\n' +
        '<a href="https://cs17.pikabu.ru/two.mp4">Видео</a>',
    );
  });

  test("does not duplicate a video that already has a link in the text", () => {
    const postText =
      'Текст\n\n<a href="https://cs2.pikabu.ru/one.mp4">Видео</a>\n\nКонец';

    expect(
      addVideoLinks(postText, [
        "https://cs2.pikabu.ru/one.mp4",
        "https://cs17.pikabu.ru/two.mp4",
      ]),
    ).toBe(`${postText}\n\n<a href="https://cs17.pikabu.ru/two.mp4">Видео</a>`);
  });
});
