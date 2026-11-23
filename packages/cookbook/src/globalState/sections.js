import _sortBy from "lodash/sortBy";

export const FETCH = "SECTIONS::FETCH";
export const FETCH_SUCCESS = "SECTIONS::FETCH_SUCCESS";
export const FETCH_FAILURE = "SECTIONS::FETCH_FAILURE";

const actionsHandler = {
  [FETCH_SUCCESS]: (state, { payload }) => _sortBy(payload, ["listOrder"]),
};

const initialState = [];

function sectionsReducer(state = initialState, action) {
  const handler = actionsHandler[action.type];

  return handler ? handler(state, action) : state;
}

export default sectionsReducer;
