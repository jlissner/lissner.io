import { SET_VALUE } from "../globalState/recipeForm";

function setValue(value) {
  return {
    type: SET_VALUE,
    payload: value,
  };
}

export default setValue;
