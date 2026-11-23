import { deleteCookie } from "../lib/cookies";
import { LOGOUT } from "../globalState/user";

function logout() {
  deleteCookie("userJWT");

  return {
    type: LOGOUT,
  };
}

export default logout;
