import _intersectionBy from "lodash/intersectionBy";
import useFilteredRecipes from "./useFilteredRecipes";
import useSearchedRecipes from "./useSearchedRecipes";
import useFavoriteRecipes from "./useFavoriteRecipes";

function useRecipeList() {
  const filteredRecipes = useFilteredRecipes();
  const searchedRecipes = useSearchedRecipes();
  const favoriteRecipes = useFavoriteRecipes();

  return _intersectionBy(
    filteredRecipes,
    searchedRecipes,
    favoriteRecipes,
    "idPk",
  );
}

export default useRecipeList;
