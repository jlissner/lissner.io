import type { NextFunction, Request, Response } from "express";
import invariant from "tiny-invariant";
import { bgMagenta, blue, gray, green, red, white, yellow } from "yoctocolors";

function logMethod(method: string) {
  switch (method.toLowerCase()) {
    case "get":
      return blue(method);
    case "post":
      return yellow(method);
    case "delete":
      return red(method);
    default:
      return bgMagenta(white(method));
  }
}

/** Wrap async route handlers so rejections become `next(err)` for the error middleware. */
export function logRequests(req: Request, _res: Response, next: NextFunction) {
  console.info(`
${gray(`Request recieved at ${new Date().toLocaleTimeString()}:`)}
${gray("[TARGET]")} ${logMethod(req.method)} ${green(req.url)}`);

  next();
}
