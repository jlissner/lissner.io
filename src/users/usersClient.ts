import * as R from "ramda";
import { db } from "../db";

function createNewUser() {}

async function addUser(user: UserModel) {
  const currentData = await db.latest();
  const updated = R.modify('users', R.append(user), currentData);

  // return await db.update(updated);
  return updated;
}

export const usersClient = {
  addUser,
};
