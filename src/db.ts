import config from "config";
import { Sequelize } from "sequelize";

const sequelize = new Sequelize(
  String(config.get("db.database")),
  String(config.get("db.username")),
  String(config.get("db.password")),
  {
    dialect: config.get("db.dialect"),
    host: String(config.get("db.host")),
    port: Number(config.get("db.port")),
  },
);

export default sequelize;
