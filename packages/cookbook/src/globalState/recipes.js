export const FETCH_RECIPES = "RECIPES::FETCH_RECIPES";
export const FETCH_RECIPES_SUCCESS = "RECIPES::FETCH_RECIPES_SUCCESS";

const ACTION_HANDLERS = {
  [FETCH_RECIPES_SUCCESS]: (state, action) => {
    return [...action.payload];
  },
};

const initialState = [];

export default function recipesReducer(state = initialState, action) {
  const handler = ACTION_HANDLERS[action.type];

  return handler ? handler(state, action) : state;
}
