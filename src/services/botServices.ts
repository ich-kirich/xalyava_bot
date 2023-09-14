import logger from "../libs/logger";
import Post from "../models/post";
import User from "../models/user";
import ApiError from "../error/apiError";
import { IPost } from "../types/types";
import TodayPost from "../models/todayPost";

export async function addNewUser(userId: number): Promise<void> {
  const user = await User.findOne({ where: { userId } });
  if (user) {
    return;
  }
  try {
    await User.create({
      userId,
    });
    logger.info(`New user with this id: ${userId} has been added`);
  } catch (e) {
    logger.error(
      `Error when adding a user to the database with this id: ${userId}`,
      new ApiError(e.status, e.message),
    );
    throw new ApiError(e.status, e.message);
  }
}

export async function startMailing(userId: number): Promise<void> {
  await User.update({ isSubscribe: true }, { where: { userId } });
  logger.info(
    `Subscribing status of the user with this id: ${userId} has been changed to true`,
  );
}

export async function stopMailing(userId: number): Promise<void> {
  await User.update({ isSubscribe: false }, { where: { userId } });
  logger.info(
    `Subscribing status of the user with this id: ${userId} has been changed to false`,
  );
}

export async function updatePosts(postsIds: number[]): Promise<number[]> {
  const notAddedPosts: number[] = [];

  for (const postId of postsIds) {
    const existingPost = await Post.findOne({ where: { postId } });

    if (!existingPost) {
      try {
        notAddedPosts.push(postId);
      } catch (e) {
        logger.error(
          `Error when adding a post to the database with this id: ${postId}`,
          new ApiError(e.status, e.message),
        );
        throw new ApiError(e.status, e.message);
      }
    }
    logger.info(`Update posts: ${notAddedPosts}`);
  }

  if (notAddedPosts.length > 0) {
    try {
      await Post.destroy({ truncate: true });
      const newPosts = postsIds.map((postId) => ({ postId }));
      await Post.bulkCreate(newPosts);
    } catch (e) {
      logger.error(
        `Error when updating post: ${postsIds}`,
        new ApiError(e.status, e.message),
      );
      throw new ApiError(e.status, e.message);
    }
  }
  return notAddedPosts;
}

export async function getUsersForMailing(): Promise<number[]> {
  try {
    const usersToSend = await User.findAll({ where: { isSubscribe: true } });
    const userIds = usersToSend.map((user) => user.dataValues.userId);
    logger.info("Received the list of users to be distributed", userIds);
    return userIds;
  } catch (e) {
    logger.error(
      "Error when generating an array of users for sending posts",
      new ApiError(e.status, e.message),
    );
    throw new ApiError(e.status, e.message);
  }
}

export async function updateTodayPost(newPost: IPost) {
  try {
    const { postId, imagesArray, postText } = newPost;
    const existingPost = await TodayPost.findOne({
      where: { postId },
    });
    if (existingPost) {
      await TodayPost.update(newPost, { where: {} });
      logger.info("Today's post has been updated");
    } else {
      await TodayPost.create({ imagesArray, postText, postId });
      logger.info(
        `Today's post has been updated to a post with this id: ${postId}`,
      );
    }
  } catch (e) {
    logger.error(
      "Error when updating today post",
      new ApiError(e.status, e.message),
    );
    throw new ApiError(e.status, e.message);
  }
}

export async function getTodayPost() {
  try {
    const allPosts = await TodayPost.findAll();
    logger.info("Today's post was received");
    console.log(allPosts[0].dataValues);
    return allPosts;
  } catch (e) {
    logger.error(
      "Error when getting today post",
      new ApiError(e.status, e.message),
    );
    throw new ApiError(e.status, e.message);
  }
}
