import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class TodayPost extends Model {
  public id!: number;

  public imagesArray!: string[];

  public postText!: string;

  public postId!: number;
}

TodayPost.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    imagesArray: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    },
    postText: {
      type: DataTypes.STRING(4096),
      allowNull: false,
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "todayPost",
  },
);

export default TodayPost;