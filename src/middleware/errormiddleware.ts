import { NextFunction, Response, Request } from "express";
import logger from "../libs/logger";
import ApiError from "../error/apiError";

function ErrorHandling(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof ApiError) {
    logger.error("Error occurred:", err);
    res.status(err.status).json({ message: err.message });
  } else {
    logger.error("Unexpected error occurred:", err);
    res.status(500).json({ message: "Unexpected error" });
  }
}

export default ErrorHandling;
