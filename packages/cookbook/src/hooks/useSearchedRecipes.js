import { useSelector } from "react-redux";
import _filter from "lodash/filter";
import _lowerCase from "lodash/lowerCase";
import useQueryString from "./useQueryString";

function useSearchedRecipes() {
  const [getQueryValue] = useQueryString();
  const recipes = useSelector((state) => state.recipes);
  const search = getQueryValue({ key: "search", defaultValue: "" });

  if (search.length === 0) {
    return recipes;
  }

  return _filter(recipes, (recipe) => {
    const words = _lowerCase(search).split(" ");
    const stringifiedRecipe = _lowerCase(JSON.stringify(recipe));
    const matchingWords = _filter(
      words,
      (word) => stringifiedRecipe.indexOf(word) > -1,
    );

    return words.length === matchingWords.length;
  });
}

export default useSearchedRecipes;
