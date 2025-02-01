import * as R from "ramda";
import { db } from "../db";
import { UserModel } from "./userModels";

async function addUser(userInput: unknown) {
  const user = UserModel.parse(userInput);
  const currentData = await db.latest();
  const updated = R.modify(
    "users",
    R.pipe(R.append(user), R.uniqBy(R.prop("email"))),
    currentData,
  );
  const res = await db.update(updated);

  return res;
}

async function getUserByEmail(email: string | undefined) {
  if (!email) return undefined;

  const { users } = await db.latest();
  const user = R.find(R.propEq(email, "email"), users);

  return user;
}

export const usersClient = {
  addUser,
  getUserByEmail,
};
