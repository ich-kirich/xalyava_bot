const config = require("config");

module.exports = {
  username: config.get("db.username"),
  password: config.get("db.password"),
  database: config.get("db.database"),
  host: config.get("db.host"),
  port: config.get("db.port"),
  dialect: config.get("db.dialect"),
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
};
