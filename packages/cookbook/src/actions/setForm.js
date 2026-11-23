import _cloneDeep from "lodash/cloneDeep";
import _forEach from "lodash/forEach";
import _get from "lodash/get";
import { SET_FORM } from "../globalState/recipeForm";

function setForm(_recipeForm) {
  const recipeForm = _cloneDeep(_recipeForm);

  recipeForm.open = recipeForm.open || false;
  recipeForm.directions = recipeForm.directions || [{ title: "", steps: [] }];
  recipeForm.ingredients = recipeForm.ingredients || [
    { title: "", ingredients: [] },
  ];
  recipeForm.author =
    recipeForm.author || _get(recipeForm, "additionalAttributes.author") || "";
  recipeForm.cookTime =
    recipeForm.cookTime ||
    _get(recipeForm, "additionalAttributes.cookTime") ||
    "";
  recipeForm.description =
    recipeForm.description ||
    _get(recipeForm, "additionalAttributes.description") ||
    "";
  recipeForm.image =
    recipeForm.image || _get(recipeForm, "additionalAttributes.image") || "";
  recipeForm.note =
    recipeForm.note || _get(recipeForm, "additionalAttributes.note") || "";
  recipeForm.serves =
    recipeForm.serves || _get(recipeForm, "additionalAttributes.serves") || "";
  recipeForm.tags = recipeForm.tags || [];

  _forEach(
    recipeForm.directions,
    (direction) => (direction.title = direction.title || ""),
  );
  _forEach(
    recipeForm.ingredients,
    (ingredient) => (ingredient.title = ingredient.title || ""),
  );

  return {
    type: SET_FORM,
    payload: recipeForm,
  };
}

export default setForm;
