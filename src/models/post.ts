import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class Post extends Model {
  public id!: number;

  public postId: number;
}

Post.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize,
    tableName: "posts",
  },
);

export default Post;
