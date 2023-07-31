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
