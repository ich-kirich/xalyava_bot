import config from "config";
import { Sequelize } from "sequelize";

console.log(config.get("telegram.apiKey"));
console.log(config.get("db.password"));

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
