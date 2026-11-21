import _get from "lodash/get";
import graphql from "../lib/graphql";
import { FETCH, FETCH_SUCCESS, FETCH_FAILURE } from "../globalState/sections";

function fetchSections() {
  return async (dispatch) => {
    dispatch({ type: FETCH });

    const body = {
      query: `
        query {
          cookbookByIdPk(idPk: "1") {
            sectionsByCookbookFk {
              nodes {
                name
                listOrder
              }
            }
          }
        }
      `,
    };

    try {
      const res = await graphql(body);
      const sections = _get(
        res,
        "cookbookByIdPk.sectionsByCookbookFk.nodes",
        [],
      );

      dispatch({ type: FETCH_SUCCESS, payload: sections });
    } catch (_err) {
      dispatch({ type: FETCH_FAILURE });
    }
  };
}

export default fetchSections;
