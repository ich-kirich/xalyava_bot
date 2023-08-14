import logger from "../libs/logger";
import Post from "../../models/post";
import User from "../../models/user";
import ApiError from "../error/apiError";

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

export async function addPosts(postsIds: number[]): Promise<number[]> {
  const notAddedPosts: number[] = [];

  for (const postId of postsIds) {
    const existingPost = await Post.findOne({ where: { postId } });

    if (!existingPost) {
      try {
        await Post.create({ postId });
        logger.info(`Added post with postId: ${postId}`);
        notAddedPosts.push(postId);
      } catch (e) {
        logger.error(
          `Error when adding a post to the database with this id: ${postId}`,
          new ApiError(e.status, e.message),
        );
        throw new ApiError(e.status, e.message);
      }
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
