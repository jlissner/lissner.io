import { ErrorRequestHandler } from "express";
import { NOT_AUTHORIZED } from "../config";

export const zodErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (err.name === "ZodError") {
    res.status(400).send({ errors: err.issues });
    return;
  }

  next(err);
};

export const authorizationErrorHandler: ErrorRequestHandler = (
  err,
  _req,
  res,
  next,
) => {
  if (
    err.message.includes(NOT_AUTHORIZED) ||
    err.message.includes("JsonWebTokenError")
  ) {
    res.status(401).send();
    return;
  }

  next(err);
};
