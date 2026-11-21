import { useMemo } from "react";
import { useDispatch } from "react-redux";
import _transform from "lodash/transform";
import actions from "../actions";

function useActions() {
  const dispatch = useDispatch();
  const wrappedActions = useMemo(
    () =>
      _transform(
        actions,
        (memo, func, key) => {
          memo[key] = (...val) => dispatch(func(...val));
        },
        {},
      ),
    [dispatch],
  );

  return wrappedActions;
}

export default useActions;
