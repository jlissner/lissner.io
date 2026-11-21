import { useSelector } from "react-redux";
import _intersectionBy from "lodash/intersectionBy";
import _map from "lodash/map";
import useFilteredRecipes from "./useFilteredRecipes";
import useSearchedRecipes from "./useSearchedRecipes";

function useNumberOfFavoriteRecipes() {
  const filteredRecipes = useFilteredRecipes();
  const searchedRecipes = useSearchedRecipes();
  const { activeUser } = useSelector((state) => state.user);
  const favoriteRecipes = _map(activeUser.favorites, (idPk) => ({ idPk }));

  return _intersectionBy(
    filteredRecipes,
    searchedRecipes,
    favoriteRecipes,
    "idPk",
  ).length;
}

export default useNumberOfFavoriteRecipes;
