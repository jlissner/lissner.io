import _get from "lodash/get";
import graphql from "../lib/graphql";
import { FETCH_TAGS, FETCH_TAGS_SUCCESS } from "../globalState/tags";

function fetchTags() {
  return async (dispatch) => {
    dispatch({ type: FETCH_TAGS });

    const body = {
      query: `
        query {
          cookbookByIdPk(idPk: "1") {
            cookbookTagsByCookbookFk(orderBy: LIST_ORDER_ASC) {
              nodes {
                category
                label
                type
              }
            }
          }
        }
      `,
    };

    const res = await graphql(body);
    const tags = _get(res, "cookbookByIdPk.cookbookTagsByCookbookFk.nodes", []);

    dispatch({ type: FETCH_TAGS_SUCCESS, payload: tags });
  };
}

export default fetchTags;
