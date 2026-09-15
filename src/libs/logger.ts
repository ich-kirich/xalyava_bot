import winston from "winston";
import { PostgresLogTransport } from "./appLogStore";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.Console(), new PostgresLogTransport()],
});

export default logger;
