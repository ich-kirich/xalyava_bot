import Post from "../models/post";
import logger from "../libs/logger";
import User from "../models/user";
import {
  addNewUser,
  getTodayPost,
  getUsersForMailing,
  startMailing,
  updatePosts,
  updateTodayPost,
} from "./botServices";
import TodayPost from "../models/todayPost";

jest.mock("../models/user");
jest.mock("../models/post");
jest.mock("../models/todayPost");

describe("addNewUser", () => {
  const userId = 1;
  const loggerSpyInfo = jest.spyOn(logger, "info");
  const loggerSpyError = jest.spyOn(logger, "error");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should not create a new user if the user already exists", async () => {
    const user = {
      userId,
    };
    (User.findOne as jest.Mock).mockResolvedValueOnce(user);

    await addNewUser(userId);

    expect(User.findOne).toHaveBeenCalledWith({ where: { userId } });
    expect(User.create).not.toHaveBeenCalled();
    expect(loggerSpyError).not.toHaveBeenCalled();
  });

  test("should create a new user if the user does not exist", async () => {
    (User.findOne as jest.Mock).mockResolvedValueOnce(null);

    await addNewUser(userId);

    expect(User.findOne).toHaveBeenCalledWith({ where: { userId } });
    expect(User.create).toHaveBeenCalledWith({ userId });
    expect(loggerSpyInfo).toHaveBeenCalledWith(
      `New user with this id: ${userId} has been added`,
    );
    expect(loggerSpyError).not.toHaveBeenCalled();
  });

  test("should throw an error if User.create fails", async () => {
    const error = new Error("User.create error");
    (User.findOne as jest.Mock).mockResolvedValueOnce(null);
    (User.create as jest.Mock).mockRejectedValueOnce(error);

    await expect(addNewUser(userId)).rejects.toThrowError(error);
    expect(User.findOne).toHaveBeenCalledWith({ where: { userId } });
    expect(User.create).toHaveBeenCalledWith({ userId });
    expect(loggerSpyInfo).not.toHaveBeenCalled();
    expect(loggerSpyError).toHaveBeenCalledWith(
      `Error when adding a user to the database with this id: ${userId}`,
      expect.anything(),
    );
  });
});

describe("startMailing", () => {
  const userId = 1;
  const loggerSpyInfo = jest.spyOn(logger, "info");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should update the user with the given id", async () => {
    (User.update as jest.Mock).mockResolvedValueOnce(null);

    await startMailing(userId);

    expect(User.update).toHaveBeenCalledWith(
      { isSubscribe: true },
      { where: { userId } },
    );
    expect(loggerSpyInfo).toHaveBeenCalledWith(
      `Subscribing status of the user with this id: ${userId} has been changed to true`,
    );
  });

  test("should throw an error if User.update fails", async () => {
    const error = new Error("User.update error");
    (User.update as jest.Mock).mockRejectedValueOnce(error);

    await expect(startMailing(userId)).rejects.toThrowError(error);
    expect(User.update).toHaveBeenCalledWith(
      { isSubscribe: true },
      { where: { userId } },
    );
    expect(loggerSpyInfo).not.toHaveBeenCalled();
  });
});

describe("startMailing", () => {
  const userId = 1;
  const loggerSpyInfo = jest.spyOn(logger, "info");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should update the user with the given id", async () => {
    (User.update as jest.Mock).mockResolvedValueOnce(null);

    await startMailing(userId);

    expect(User.update).toHaveBeenCalledWith(
      { isSubscribe: true },
      { where: { userId } },
    );
    expect(loggerSpyInfo).toHaveBeenCalledWith(
      `Subscribing status of the user with this id: ${userId} has been changed to true`,
    );
  });

  test("should throw an error if User.update fails", async () => {
    const error = new Error("User.update error");
    (User.update as jest.Mock).mockRejectedValueOnce(error);

    await expect(startMailing(userId)).rejects.toThrowError(error);
    expect(User.update).toHaveBeenCalledWith(
      { isSubscribe: true },
      { where: { userId } },
    );
    expect(loggerSpyInfo).not.toHaveBeenCalled();
  });
});

describe("updatePosts", () => {
  const postIds = [1, 2, 3];
  const loggerSpyInfo = jest.spyOn(logger, "info");
  const loggerSpyError = jest.spyOn(logger, "error");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should return an empty array if all posts exist in the database", async () => {
    const existingPosts = [{ postId: 1 }, { postId: 2 }, { postId: 3 }];
    (Post.findOne as jest.Mock).mockImplementation((options) => {
      return Promise.resolve(
        existingPosts.find((post) => post.postId === options.where.postId),
      );
    });

    const result = await updatePosts(postIds);

    expect(Post.findOne).toHaveBeenCalledTimes(postIds.length);
    expect(Post.bulkCreate).not.toHaveBeenCalled();
    expect(result).toEqual([]);
    expect(loggerSpyInfo).toHaveBeenCalledTimes(postIds.length);
    expect(loggerSpyError).not.toHaveBeenCalled();
  });

  test("should return an array of post ids that do not exist in the database", async () => {
    const existingPosts = [{ postId: 1 }, { postId: 3 }];
    (Post.findOne as jest.Mock).mockImplementation((options) => {
      return Promise.resolve(
        existingPosts.find((post) => post.postId === options.where.postId),
      );
    });

    const result = await updatePosts(postIds);

    expect(Post.findOne).toHaveBeenCalledTimes(postIds.length);
    expect(Post.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result).toEqual([2]);
    expect(loggerSpyInfo).toHaveBeenCalledTimes(postIds.length);
    expect(loggerSpyError).not.toHaveBeenCalled();
  });

  test("should throw an error if Post.bulkCreate fails", async () => {
    const error = new Error("Post.bulkCreate error");
    (Post.bulkCreate as jest.Mock).mockRejectedValueOnce(error);

    await expect(updatePosts(postIds)).rejects.toThrowError(error);
    expect(Post.findOne).toHaveBeenCalledTimes(postIds.length);
    expect(Post.bulkCreate).toHaveBeenCalled();
    expect(loggerSpyInfo).toHaveBeenCalledTimes(postIds.length);
    expect(loggerSpyError).toHaveBeenCalledWith(
      `Error when updating post: ${postIds}`,
      expect.anything(),
    );
  });
});

describe("getUsersForMailing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const loggerSpyInfo = jest.spyOn(logger, "info");
  const loggerSpyError = jest.spyOn(logger, "error");

  test("should return an array of user ids", async () => {
    const users = [
      { dataValues: { userId: 1 } },
      { dataValues: { userId: 2 } },
      { dataValues: { userId: 3 } },
    ];
    (User.findAll as jest.Mock).mockResolvedValue(users);

    const result = await getUsersForMailing();

    expect(User.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual([1, 2, 3]);
    expect(loggerSpyInfo).toHaveBeenCalledWith(
      "Received the list of users to be distributed",
      [1, 2, 3],
    );
    expect(loggerSpyError).not.toHaveBeenCalled();
  });

  test("should throw an error if User.findAll fails", async () => {
    const error = new Error("User.findAll error");
    (User.findAll as jest.Mock).mockRejectedValueOnce(error);

    await expect(getUsersForMailing()).rejects.toThrowError(error);
    expect(User.findAll).toHaveBeenCalledTimes(1);
    expect(loggerSpyInfo).not.toHaveBeenCalled();
    expect(loggerSpyError).toHaveBeenCalledWith(
      "Error when generating an array of users for sending posts",
      expect.anything(),
    );
  });
});

describe("updateTodayPost", () => {
  const newPost = {
    postId: 1,
    imagesArray: ["image1", "image2"],
    postText: "Post text",
  };

  const loggerSpyInfo = jest.spyOn(logger, "info");
  const loggerSpyError = jest.spyOn(logger, "error");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should not update an existing post if it does exist", async () => {
    (TodayPost.findOne as jest.Mock).mockResolvedValueOnce({ postId: 1 });
    await updateTodayPost(newPost);
    expect(TodayPost.findOne).toHaveBeenCalledTimes(1);
    expect(loggerSpyError).not.toHaveBeenCalled();
  });

  test("should create a new post if it does not exist", async () => {
    (TodayPost.findOne as jest.Mock).mockResolvedValueOnce(null);
    await updateTodayPost(newPost);
    expect(TodayPost.findOne).toHaveBeenCalledTimes(1);
    expect(TodayPost.create).toHaveBeenCalledTimes(1);
    expect(TodayPost.update).not.toHaveBeenCalled();
    expect(loggerSpyInfo).toHaveBeenCalledWith(
      `Today's post has been updated to a post with this id: ${newPost.postId}`,
    );
    expect(loggerSpyError).not.toHaveBeenCalled();
  });

  test("should throw an error if an error occurs", async () => {
    const error = new Error("TodayPost.findOne error");
    (TodayPost.findOne as jest.Mock).mockRejectedValueOnce(error);

    await expect(updateTodayPost(newPost)).rejects.toThrowError(error);
    expect(TodayPost.findOne).toHaveBeenCalledTimes(1);
    expect(TodayPost.create).not.toHaveBeenCalled();
    expect(TodayPost.update).not.toHaveBeenCalled();
    expect(loggerSpyInfo).not.toHaveBeenCalled();
    expect(loggerSpyError).toHaveBeenCalledWith(
      "Error when updating today post",
      expect.anything(),
    );
  });
});

describe("getTodayPost", () => {
  const todayPost = {
    postId: 1,
    imagesArray: ["image1", "image2"],
    postText: "Post text",
  };

  const loggerSpyInfo = jest.spyOn(logger, "info");
  const loggerSpyError = jest.spyOn(logger, "error");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should return all posts", async () => {
    (TodayPost.findAll as jest.Mock).mockResolvedValueOnce([todayPost]);
    const result = await getTodayPost();
    expect(TodayPost.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual([todayPost]);
    expect(loggerSpyInfo).toHaveBeenCalledWith("Today's post was received");
    expect(loggerSpyError).not.toHaveBeenCalled();
  });

  test("should throw an error if an error occurs", async () => {
    const error = new Error("TodayPost.findAll error");
    (TodayPost.findAll as jest.Mock).mockRejectedValueOnce(error);

    await expect(getTodayPost()).rejects.toThrowError(error);
    expect(TodayPost.findAll).toHaveBeenCalledTimes(1);
    expect(loggerSpyInfo).not.toHaveBeenCalled();
    expect(loggerSpyError).toHaveBeenCalledWith(
      "Error when getting today post",
      expect.anything(),
    );
  });
});
