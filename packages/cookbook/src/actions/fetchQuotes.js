import _get from "lodash/get";
import graphql from "../lib/graphql";
import {
  FETCH_QUOTES,
  FETCH_QUOTES_SUCCESS,
  FETCH_QUOTES_FAILURE,
} from "../globalState/quotes";

function fetchQuotes() {
  return async (dispatch) => {
    dispatch({ type: FETCH_QUOTES });

    try {
      const res = await graphql({
        query: `
          query {
            cookbookByIdPk(idPk: "1") {
              cookbookQuotesByCookbookFk {
                nodes {
                  author
                  quote
                }
              }
            }
          }
        `,
      });
      const payload = _get(
        res,
        "cookbookByIdPk.cookbookQuotesByCookbookFk.nodes",
      );

      dispatch({
        type: FETCH_QUOTES_SUCCESS,
        payload,
      });
    } catch (err) {
      console.error(err);

      dispatch({ type: FETCH_QUOTES_FAILURE });
    }
  };
}

export default fetchQuotes;
