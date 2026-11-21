import graphql from "../lib/graphql";
import { FAVORITE_UPDATED } from "../globalState/user";
import getCurrentUser from "./getCurrentUser";

function addFavorite(recipeFk) {
  const body = {
    query: `
      mutation {
        createCookbookFavoriteRecipe(input: {cookbookFavoriteRecipe: {recipeFk: "${recipeFk}", cookbookFk: "1"}}) {
          clientMutationId
        }
      }
    `,
  };

  return graphql(body);
}

function removeFavorite(recipeFk) {
  const body = {
    query: `
      mutation {
        removeFavoriteRecipe(input: {recipeId: "${recipeFk}", cookbookId: "1"}) {
          clientMutationId
        }
      }
    `,
  };

  return graphql(body);
}

function toggleFavorite(recipeFk) {
  return async (dispatch, getState) => {
    const { favorites } = getState().user.activeUser;
    const isFavorite = favorites.indexOf(recipeFk) > -1;

    if (isFavorite) {
      await removeFavorite(recipeFk);
    } else {
      await addFavorite(recipeFk);
    }

    dispatch({ type: FAVORITE_UPDATED });

    dispatch(getCurrentUser());
  };
}

export default toggleFavorite;
