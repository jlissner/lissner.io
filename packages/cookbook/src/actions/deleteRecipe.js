import { toast } from "react-toastify";
import graphql from "../lib/graphql";
import {
  DELETE,
  DELETE_SUCCESS,
  DELETE_FAILURE,
} from "../globalState/recipeForm";
import fetchRecipes from "./fetchRecipes";

function deleteRecipe(idPk) {
  return async (dispatch) => {
    dispatch({ type: DELETE });

    try {
      const body = {
        query: `
          mutation {
            deleteRecipeByIdPk(input: {idPk: "${idPk}"}) {
              clientMutationId
            }
          }
        `,
      };

      await graphql(body);
      toast.success("Successfully Deleted Recipe");

      dispatch({ type: DELETE_SUCCESS });
      dispatch(fetchRecipes());
    } catch (err) {
      toast.error(err.message);

      dispatch({ type: DELETE_FAILURE, payload: err });
    }
  };
}

export default deleteRecipe;
