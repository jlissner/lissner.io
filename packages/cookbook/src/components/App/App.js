import React from "react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles";
import store from "../../redux/store";
import SecuredApp from "./SecuredApp";

const theme = createMuiTheme({
  palette: {
    primary: {
      main: "#5b8266",
      light: "#a5baab",
      dark: "#223026",
    },
    secondary: {
      main: "#a93f55",
      light: "#d096a2",
      dark: "#3e171f",
    },
    accent1: {
      main: "#edae49",
      light: "#f5d29b",
      dark: "#57401b",
    },
    accent2: {
      main: "#30638e",
      light: "#8ea9c1",
      dark: "#122434",
    },
  },
  typography: {
    useNextVariants: true,
  },
});

function App() {
  return (
    <React.Fragment>
      <Provider store={store(window.__INITIAL_STATE__)}>
        <MuiThemeProvider theme={theme}>
          <BrowserRouter>
            <SecuredApp />
          </BrowserRouter>
        </MuiThemeProvider>
      </Provider>
    </React.Fragment>
  );
}

export default App;
