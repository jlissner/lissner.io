import { combineReducers } from "redux";
import globalState from "../globalState";

const reducers = (asyncReducers) =>
  combineReducers({
    ...globalState,
    ...asyncReducers,
  });

export default reducers;
