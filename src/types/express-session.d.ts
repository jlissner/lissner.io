import 'express-session';
import jwt from 'jsonwebtoken';

declare module 'express-session' {
  export interface SessionData {
    user: jwt.JwtPayload | undefined;
    userToken: string | undefined;
  }
}
