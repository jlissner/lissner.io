import { useMemo } from "react";
import { useLocation, useHistory } from "react-router-dom";
import qs from "query-string";
import _get from "lodash/get";
import _omit from "lodash/omit";

function useQueryString() {
  const location = useLocation();
  const history = useHistory();
  const query = useMemo(() => qs.parse(location.search), [location.search]);

  function getQueryValue({ key, defaultValue }) {
    return _get(query, key, defaultValue);
  }

  function setQueryValue({ key, value }) {
    const newQuery = value ? { ...query, [key]: value } : _omit(query, [key]);

    history.push({ search: qs.stringify(newQuery) });
  }

  return [getQueryValue, setQueryValue];
}

export default useQueryString;
