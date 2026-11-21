export const FETCH_TAGS = "TAGS::FETCH_TAGS";
export const FETCH_TAGS_SUCCESS = "TAGS::FETCH_TAGS_SUCCESS";

const ACTION_HANDLERS = {
  [FETCH_TAGS_SUCCESS]: (state, action) => {
    return [...action.payload];
  },
};

const initialState = [];

export default function tagsReducer(state = initialState, action) {
  const handler = ACTION_HANDLERS[action.type];

  return handler ? handler(state, action) : state;
}
