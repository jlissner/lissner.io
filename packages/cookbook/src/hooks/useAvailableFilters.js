import { useSelector } from "react-redux";
import _find from "lodash/find";
import _transform from "lodash/transform";
import _sortBy from "lodash/sortBy";
import _filter from "lodash/filter";
import _findIndex from "lodash/findIndex";
import _intersectionBy from "lodash/intersectionBy";
import _pick from "lodash/pick";
import { filterRecipes } from "./useFilteredRecipes";
import useQueryString from "./useQueryString";
import useSearchedRecipes from "./useSearchedRecipes";
import useFavoriteRecipes from "./useFavoriteRecipes";

function useAvailableFilters() {
  const [getQueryValue] = useQueryString();
  const tags = useSelector((state) => state.tags);
  const recipes = useSelector((state) => state.recipes);
  const searchedRecipes = useSearchedRecipes();
  const favoriteRecipes = useFavoriteRecipes();
  const filtersString = getQueryValue({ key: "filters", defaultValue: "[]" });
  const filters = JSON.parse(filtersString);

  return _transform(
    tags,
    (memo, tag) => {
      const filter = _pick(tag, ["category", "label"]);
      const filteredRecipes = filterRecipes(recipes, [...filters, filter]);
      const searchedFilteredRecipes = _intersectionBy(
        filteredRecipes,
        searchedRecipes,
        favoriteRecipes,
        "idPk",
      );
      const availableRecipes = _filter(searchedFilteredRecipes, (recipe) =>
        _find(recipe.tags, filter),
      );
      const foundIndex = _findIndex(memo, ["category", tag.category]);
      const index = foundIndex === -1 ? memo.length : foundIndex;

      tag.checked = Boolean(_find(filters, filter));
      tag.numberOfRecipes = availableRecipes.length;

      if (foundIndex === -1) {
        memo.push({ category: tag.category, filters: [tag] });
      } else {
        memo[index].filters.push(tag);
      }

      memo[index].filters = _sortBy(memo[index].filters, ["listOrder"]);
    },
    [],
  );
}

export default useAvailableFilters;
