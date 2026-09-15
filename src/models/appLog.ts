import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class AppLog extends Model {
  public id!: number;

  public level!: string;

  public message!: string;

  public meta!: Record<string, unknown> | null;

  public createdAt!: Date;
}

AppLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    level: {
      type: DataTypes.ENUM("warn", "error"),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    meta: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "appLog",
    updatedAt: false,
  },
);

export default AppLog;
