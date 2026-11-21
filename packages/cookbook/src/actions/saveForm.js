import graphql, { objToGraphqlStr } from "../lib/graphql";
import { SAVE_FORM, SAVE_FORM_SUCCESS } from "../globalState/recipeForm";
import fetchRecipes from "./fetchRecipes";

function newRecipe(params) {
  const body = {
    query: `
      mutation {
        createRecipe(input: {
          ${objToGraphqlStr(params)}
        }) {
          clientMutationId
        }
      }
    `,
  };

  return graphql(body);
}

function updateRecipe(params) {
  const body = {
    query: `
      mutation {
        updateRecipe(input: {
          ${objToGraphqlStr(params)}
        }) {
          clientMutationId
        }
      }
    `,
  };

  return graphql(body);
}

function saveForm() {
  return async (dispatch, getState) => {
    dispatch({ type: SAVE_FORM });

    const { recipeForm } = getState();
    const {
      idPk,
      name,
      ingredients,
      directions,
      author,
      description,
      note,
      cookTime,
      serves,
      tags,
    } = recipeForm;
    const params = {
      cookbookId: "1",
      name,
      ingredients,
      directions,
      additionalAttributes: {
        author,
        description,
        note,
        cookTime,
        serves,
      },
      tags,
    };

    if (idPk) {
      await updateRecipe({ recipeId: idPk, ...params });
    } else {
      await newRecipe(params);
    }

    dispatch({ type: SAVE_FORM_SUCCESS });
    dispatch(fetchRecipes());
  };
}

export default saveForm;
