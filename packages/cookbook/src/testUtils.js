import React from "react";
import { Provider } from "react-redux";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import createStore from "./redux/store";
import defaultInitialState from "../__mocks__/defaultInitialState";

export function renderWithRedux(
  ui,
  {
    initialState = defaultInitialState,
    store = createStore(initialState),
  } = {},
) {
  return {
    ...render(<Provider store={store}>{ui}</Provider>),
    store,
  };
}

export function renderWithRouter(ui) {
  return {
    ...render(<BrowserRouter>{ui}</BrowserRouter>),
  };
}

export function renderWithReduxAndRounter(
  ui,
  {
    initialState = defaultInitialState,
    store = createStore(initialState),
  } = {},
) {
  return {
    ...render(
      <Provider store={store}>
        <BrowserRouter>{ui}</BrowserRouter>
      </Provider>,
    ),
    store,
  };
}
