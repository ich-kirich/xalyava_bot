import {
  addNewUser,
  getTodayPost,
  getUsersForMailing,
  startMailing,
  stopMailing,
  updatePosts,
  updateTodayPost,
} from "../../src/services/botServices";
import Post from "../../src/models/post";
import User from "../../src/models/user";
import TodayPost from "../../src/models/todayPost";

jest.mock("../../src/models/post", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    destroy: jest.fn(),
    bulkCreate: jest.fn(),
  },
}));

jest.mock("../../src/models/user", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn(),
  },
}));

jest.mock("../../src/models/todayPost", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
}));

describe("botServices", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("addNewUser skips create when the user already exists", async () => {
    (User.findOne as jest.Mock).mockResolvedValue({ userId: 20 });

    await addNewUser(20);

    expect(User.create).not.toHaveBeenCalled();
  });

  test("addNewUser creates a missing user", async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);

    await addNewUser(20);

    expect(User.create).toHaveBeenCalledWith({ userId: 20 });
  });

  test("startMailing and stopMailing toggle isSubscribe", async () => {
    await startMailing(20);
    await stopMailing(20);

    expect(User.update).toHaveBeenNthCalledWith(
      1,
      { isSubscribe: true },
      { where: { userId: 20 } },
    );
    expect(User.update).toHaveBeenNthCalledWith(
      2,
      { isSubscribe: false },
      { where: { userId: 20 } },
    );
  });

  test("getUsersForMailing returns subscribed user ids", async () => {
    (User.findAll as jest.Mock).mockResolvedValue([
      { dataValues: { userId: 1 } },
      { dataValues: { userId: 2 } },
    ]);

    await expect(getUsersForMailing()).resolves.toEqual([1, 2]);
    expect(User.findAll).toHaveBeenCalledWith({
      where: { isSubscribe: true },
    });
  });

  test("updatePosts does not rewrite the table when every id is already stored", async () => {
    (Post.findOne as jest.Mock).mockResolvedValue({ postId: 1 });

    await expect(updatePosts([1, 2])).resolves.toEqual([]);
    expect(Post.destroy).not.toHaveBeenCalled();
    expect(Post.bulkCreate).not.toHaveBeenCalled();
  });

  test("updatePosts truncates and stores the full id list when any post is new", async () => {
    (Post.findOne as jest.Mock)
      .mockResolvedValueOnce({ postId: 1 })
      .mockResolvedValueOnce(null);

    await expect(updatePosts([1, 2])).resolves.toEqual([2]);
    expect(Post.destroy).toHaveBeenCalledWith({ truncate: true });
    expect(Post.bulkCreate).toHaveBeenCalledWith([
      { postId: 1 },
      { postId: 2 },
    ]);
  });

  test("updateTodayPost creates when missing and updates every row when present", async () => {
    const post = {
      postId: 9,
      postText: "text",
      imagesArray: ["a.jpg"],
    };
    (TodayPost.findOne as jest.Mock).mockResolvedValueOnce(null);
    await updateTodayPost(post);
    expect(TodayPost.create).toHaveBeenCalledWith({
      imagesArray: post.imagesArray,
      postText: post.postText,
      postId: post.postId,
    });

    (TodayPost.findOne as jest.Mock).mockResolvedValueOnce({ postId: 9 });
    await updateTodayPost(post);
    expect(TodayPost.update).toHaveBeenCalledWith(post, { where: {} });
  });

  test("getTodayPost returns every stored today post", async () => {
    const rows = [{ dataValues: { postId: 1 } }];
    (TodayPost.findAll as jest.Mock).mockResolvedValue(rows);

    await expect(getTodayPost()).resolves.toBe(rows);
  });
});
