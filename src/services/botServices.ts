import Post from "../../models/post";
import User from "../../models/user";

export async function addNewUser(userId: number) {
  const user = await User.findOne({ where: { userId } });
  if (!user) {
    const newUser = await User.create({
      userId,
    });
  }
}

export async function startMailing(userId: number) {
  await User.update({ isMailing: true }, { where: { userId } });
}

export async function stopMailing(userId: number) {
  await User.update({ isMailing: false }, { where: { userId } });
}

export async function addPosts(postsIds: number[]) {
  let added = false;

  for (const postId of postsIds) {
    const existingPost = await Post.findOne({ where: { postId } });

    if (!existingPost) {
      try {
        await Post.create({ postId });
        console.log(`Added post with postId: ${postId}`);
        added = true;
      } catch (e) {
        console.error(e.message);
      }
    }
  }
  if (!added) {
    return null;
  }
  return 0;
}

export async function getUsersForMailing(): Promise<number[]> {
  try {
    const usersToSend = await User.findAll({ where: { isMailing: true } });
    const userIds = usersToSend.map((user) => user.dataValues.userId);
    return userIds;
  } catch (error) {
    console.error("Error getting users for mailing:", error);
  }
}
