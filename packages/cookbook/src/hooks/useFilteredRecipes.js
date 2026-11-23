import { useSelector } from "react-redux";
import _filter from "lodash/filter";
import _find from "lodash/find";
import _uniqBy from "lodash/uniqBy";
import useQueryString from "./useQueryString";

export function filterRecipes(recipes, filters) {
  if (filters.length === 0) {
    return recipes;
  }

  const numberOfCategories = _uniqBy(filters, "category").length;

  return _filter(recipes, (recipe) => {
    const appliedFilters = _filter(filters, (filter) =>
      _find(recipe.tags, filter),
    );
    const numberOfAppliedCategories = _uniqBy(
      appliedFilters,
      "category",
    ).length;

    return numberOfAppliedCategories === numberOfCategories;
  });
}

function useFilteredRecipes() {
  const [getQueryValue] = useQueryString();
  const recipes = useSelector((state) => state.recipes);
  const filters = getQueryValue({ key: "filters", defaultValue: "[]" });

  return filterRecipes(recipes, JSON.parse(filters));
}

export default useFilteredRecipes;
