import _get from "lodash/get";
import graphql from "../lib/graphql";
import {
  userQuery,
  FETCH_USERS,
  FETCH_USERS_SUCCESS,
  FETCH_USERS_FAILURE,
} from "../globalState/user";

function fetchUsers() {
  return async (dispatch) => {
    dispatch({ type: FETCH_USERS });

    try {
      const res = await graphql({
        query: `
          query {
            allPeople {
              nodes {
                ${userQuery}
              }
            }
          }
        `,
      });
      const users = _get(res, "allPeople.nodes");

      dispatch({ type: FETCH_USERS_SUCCESS, payload: users });
    } catch (err) {
      dispatch({ type: FETCH_USERS_FAILURE, payload: err });
    }
  };
}

export default fetchUsers;
