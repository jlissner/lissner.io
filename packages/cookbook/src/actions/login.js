import { toast } from "react-toastify";
import _get from "lodash/get";
import { setCookie } from "../lib/cookies";
import graphql from "../lib/graphql";
import { LOGIN, LOGIN_SUCCESS, LOGIN_FAILURE } from "../globalState/user";
import getCurrentUser from "./getCurrentUser";

function login(email, pass) {
  return async (dispatch) => {
    dispatch({ type: LOGIN });
    const body = {
      query: `
        mutation {
          authenticate(input: {email: "${email}", pass: "${pass}"}) {
            jwtToken
          }  
        }
      `,
    };

    try {
      const res = await graphql(body);
      const token = _get(res, "authenticate.jwtToken");

      if (!token) {
        throw new Error("Incorrect credentials");
      }

      const sevenDays = 60 * 60 * 24 * 7;

      setCookie("userJWT", token, sevenDays);

      toast.success("Logged in");

      dispatch({ type: LOGIN_SUCCESS });
      dispatch(getCurrentUser());
    } catch (err) {
      toast.error(err.message);

      dispatch({ type: LOGIN_FAILURE, payload: err });
    }
  };
}

export default login;
