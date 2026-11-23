export const FETCH_QUOTES = "QUOTES::FETCH";
export const FETCH_QUOTES_SUCCESS = "QUOTES::FETCH_SUCCESS";
export const FETCH_QUOTES_FAILURE = "QUOTES::FETCH_FAILURE";

const ACTION_HANDLERS = {
  [FETCH_QUOTES_SUCCESS]: (state, { payload }) => payload,
};

const initialState = [];

function quotesReducer(state = initialState, action) {
  const handler = ACTION_HANDLERS[action.type];

  return handler ? handler(state, action) : state;
}

export default quotesReducer;
