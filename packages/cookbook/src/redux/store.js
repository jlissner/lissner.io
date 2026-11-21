import { applyMiddleware, createStore } from "redux";
import thunk from "redux-thunk";
import { createLogger } from "redux-logger";
import makeReducers from "./reducers";

const store = (initialState = {}) => {
  const middleware = [thunk];

  if (import.meta.env.DEV) {
    const logger = createLogger({
      collapsed: true,
      duration: true,
    });

    middleware.push(logger);
  }

  const store = createStore(
    makeReducers(),
    initialState,
    applyMiddleware(...middleware),
  );

  store.asyncReducers = {};

  return store;
};

export default store;
