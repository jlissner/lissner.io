import React from "react";
import ReactDOM from "react-dom";
import App from "./components/App/App";
import {
  // registerServiceWorker,
  unregister,
} from "./registerServiceWorker";
import "react-toastify/dist/ReactToastify.css";

ReactDOM.render(<App />, document.getElementById("root"));

// registerServiceWorker();
unregister();
