import _get from "lodash/get";
import graphql from "../lib/graphql";
import { FETCH_RECIPES, FETCH_RECIPES_SUCCESS } from "../globalState/recipes";

function fetchRecipes() {
  return async (dispatch) => {
    dispatch({ type: FETCH_RECIPES });

    const body = {
      query: `
        query {
          cookbookByIdPk(idPk: "1") {
            recipes {
              nodes {
                idPk
                authorFk
                name
                directions
                ingredients
                tags
                additionalAttributes
                comments
              }
            }
          }
        }
      `,
    };
    const res = await graphql(body);
    const recipes = _get(res, "cookbookByIdPk.recipes.nodes", []);

    dispatch({ type: FETCH_RECIPES_SUCCESS, payload: recipes });
  };
}

export default fetchRecipes;
