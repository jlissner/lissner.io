import axios from "axios";
import _get from "lodash/get";
import _reduce from "lodash/reduce";
import _trimStart from "lodash/trimStart";
import config from "../config";
import { getCookie } from "./cookies";

const { url } = config.postgraphile;

export function objToGraphqlStr(obj) {
  function arrToGraphqlStr(arr) {
    const mappedVals = arr.map((val) => {
      const isArr = val instanceof Array;
      const isObj = typeof val === "object";

      if (isArr) {
        return arrToGraphqlStr(val);
      }

      return isObj ? `{${objToGraphqlStr(val)}}` : JSON.stringify(val);
    });

    return `[${mappedVals.join(", ")}]`;
  }

  const str = _reduce(
    obj,
    (cur, val, key) => {
      const isNull = val === null || val === undefined;
      const isArr = val instanceof Array;
      const isObj = typeof val === "object";

      if (isNull) {
        return `${cur}, ${key}: null`;
      }

      if (isArr) {
        return `${cur}, ${key}: ${arrToGraphqlStr(val)}`;
      }

      return isObj
        ? `${cur}, ${key}: {${objToGraphqlStr(val)}}`
        : `${cur}, ${key}: ${JSON.stringify(val)}`;
    },
    "",
  );

  return _trimStart(str, ", ");
}

async function graphql(body) {
  const token = getCookie("userJWT");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await axios.post(url, body, { headers });
  const hasError = _get(res, "data.errors.length");

  if (hasError) {
    throw new Error(
      _get(res, "data.errors[0].message", "Something went wrong"),
    );
  }

  return _get(res, "data.data");
}

export default graphql;
