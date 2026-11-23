import _omitBy from "lodash/omitBy";
import graphql, { objToGraphqlStr } from "../lib/graphql";
import { UPDATE, UPDATE_SUCCESS, UPDATE_FAILURE } from "../globalState/user";

function updateUser(user) {
  return async (dispatch, getState) => {
    dispatch({
      type: UPDATE,
    });
    const currentUser = getState().user.activeUser;
    const patch = _omitBy(user, (val, key) => currentUser[key] === val);
    const patchStr = objToGraphqlStr(patch);
    const body = {
      query: `
        mutation {
          updatePersonByIdPk(input: {idPk: "${user.idPk}", personPatch: {${patchStr}}}) {
            person {
              idPk
            }
          }
        }
      `,
    };

    try {
      await graphql(body);

      dispatch({
        type: UPDATE_SUCCESS,
        payload: user,
      });
    } catch (err) {
      dispatch({
        type: UPDATE_FAILURE,
        payload: err,
      });
    }
  };
}

export default updateUser;
