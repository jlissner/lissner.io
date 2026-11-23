import _cloneDeep from "lodash/cloneDeep";

const initialState = {
  open: false,
  saving: false,
  name: "",
  ingredients: [{ title: "", ingredients: [] }],
  directions: [{ title: "", steps: [] }],
  author: "",
  description: "",
  note: "",
  cookTime: "",
  serves: "",
  tags: [],
};

export const OPEN_FORM = "RECIPE_FORM::OPEN_FORM";
export const CLOSE_FORM = "RECIPE_FORM::CLOSE_FORM";
export const SET_FORM = "RECIPE_FORM::SET_FORM";
export const RESET_FORM = "RECIPE_FORM::RESET_FORM";
export const SET_VALUE = "RECIPE_FORM::SET_VALUE";
export const SAVE_FORM = "RECIPE_FORM::SAVE_FORM";
export const SAVE_FORM_SUCCESS = "RECIPE_FORM::SAVE_FORM_SUCCESS";
export const DELETE = "RECIPE_FORM::DELETE";
export const DELETE_SUCCESS = "RECIPE_FORM::DELETE_SUCCESS";
export const DELETE_FAILURE = "RECIPE_FORM::DELETE_FAILURE";

const ACTION_HANDLERS = {
  [OPEN_FORM]: (state) => {
    return { ...state, open: true };
  },
  [CLOSE_FORM]: (state) => {
    return { ...state, open: false };
  },
  [DELETE_SUCCESS]: (state) => {
    return { ...state, open: false };
  },
  [SET_FORM]: (state, action) => {
    return { ...action.payload };
  },
  [SET_VALUE]: (state, action) => {
    const { key, value } = action.payload;

    if (value instanceof Array) {
      return {
        ...state,
        [key]: [...value],
      };
    }

    if (typeof value === "object") {
      return {
        ...state,
        [key]: { ...value },
      };
    }

    return {
      ...state,
      [key]: value,
    };
  },
  [RESET_FORM]: (_state, _action) => {
    return _cloneDeep(initialState);
  },
  [SAVE_FORM]: (state, _action) => {
    return {
      ...state,
      saving: true,
    };
  },
  [SAVE_FORM_SUCCESS]: (state, _action) => {
    return {
      ...state,
      saving: false,
    };
  },
};

export default function recipeFormReducer(
  state = _cloneDeep(initialState),
  action,
) {
  const handler = ACTION_HANDLERS[action.type];

  return handler ? handler(state, action) : state;
}
