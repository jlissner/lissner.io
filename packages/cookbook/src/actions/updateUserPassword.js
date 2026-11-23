import { toast } from "react-toastify";
import _get from "lodash/get";
import graphql from "../lib/graphql";
import {
  UPDATE_PASSWORD,
  UPDATE_PASSWORD_SUCCESS,
  UPDATE_PASSWORD_FAILURE,
} from "../globalState/user";
import getCurrentUser from "./getCurrentUser";

function updateUserPassword({ idPk, currentPassword, newPassword }) {
  return async (dispatch, _getState) => {
    dispatch({
      type: UPDATE_PASSWORD,
    });
    const body = {
      query: `
        mutation {
          updateUserPassword(input: {
            personId: "${idPk}",
            currentPassword: "${currentPassword}",
            newPassword: "${newPassword}"
          }) {
            bigInt
          }
        }
      `,
    };

    try {
      const res = await graphql(body);
      const bigInt = _get(res, "updateUserPassword.bigInt");

      if (!bigInt) {
        throw new Error("Something went wrong");
      }

      toast.success("Password Successfully changed");

      dispatch({
        type: UPDATE_PASSWORD_SUCCESS,
      });
      dispatch(getCurrentUser());
    } catch (err) {
      toast.error(err.message);

      dispatch({
        type: UPDATE_PASSWORD_FAILURE,
        payload: err,
      });
    }
  };
}

export default updateUserPassword;
