import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class User extends Model {
  public id!: number;

  public userId: number;

  public isSubscribe!: boolean;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    isSubscribe: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "users",
  },
);

export default User;
