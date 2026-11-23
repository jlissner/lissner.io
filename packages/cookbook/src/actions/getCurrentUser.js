import _get from "lodash/get";
import graphql from "../lib/graphql";
import {
  userQuery,
  GET_CURRENT_USER,
  GET_CURRENT_USER_SUCCESS,
  GET_CURRENT_USER_FAILURE,
} from "../globalState/user";
import fetchUsers from "./fetchUsers";
import logout from "./logout";

function setLastOnline() {
  const body = {
    query: `
      mutation {
        setLastLogin(input: {}) {
          clientMutationId
        }
      }      
    `,
  };

  return graphql(body);
}

function getCurrentUser() {
  return async (dispatch) => {
    dispatch({ type: GET_CURRENT_USER });

    const body = {
      query: `
        query {
          getCurrentUser {
            ${userQuery}

            favorites: cookbookFavoriteRecipesByUserFk {
              nodes {
                recipeFk
              }
            }
          }
        }
      `,
    };

    try {
      const res = await graphql(body);
      const user = _get(res, "getCurrentUser", {});
      const favorites = _get(res, "getCurrentUser.favorites.nodes", []).map(
        ({ recipeFk }) => recipeFk,
      );

      setLastOnline();

      dispatch({
        type: GET_CURRENT_USER_SUCCESS,
        payload: {
          ...user,
          favorites,
        },
      });
      dispatch(fetchUsers());
    } catch (err) {
      logout();
      dispatch({ type: GET_CURRENT_USER_FAILURE, payload: err });
    }
  };
}

export default getCurrentUser;
