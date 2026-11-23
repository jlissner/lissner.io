import { toast } from "react-toastify";
import graphql, { objToGraphqlStr } from "../lib/graphql";
import { CREATE, CREATE_SUCCESS, CREATE_FAILURE } from "../globalState/user";
import fetchUsers from "./fetchUsers";

function createUser(user) {
  return async (dispatch) => {
    dispatch({ type: CREATE });

    const body = {
      query: `
        mutation {
          createPerson(input: {person: {${objToGraphqlStr(user)}}}) {
            clientMutationId
          }
        }
      `,
    };

    try {
      await graphql(body);

      dispatch({ type: CREATE_SUCCESS });
      dispatch(fetchUsers());
    } catch (err) {
      toast.error("Create User Failed");

      dispatch({ type: CREATE_FAILURE, payload: err });
    }
  };
}

export default createUser;
