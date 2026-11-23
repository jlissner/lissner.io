import { useSelector } from "react-redux";
import _intersectionWith from "lodash/intersectionWith";
import useQueryString from "./useQueryString";

export function favoriteRecipes(recipes, user, favorite) {
  if (!favorite) {
    return recipes;
  }

  return _intersectionWith(recipes, user.favorites, (a, b) => a.idPk === b);
}

function useFavoriteRecipes() {
  const [getQueryValue] = useQueryString();
  const recipes = useSelector((state) => state.recipes);
  const { activeUser } = useSelector((state) => state.user);
  const favorite = getQueryValue({ key: "favorite" }) === "true";

  return favoriteRecipes(recipes, activeUser, favorite);
}

export default useFavoriteRecipes;
