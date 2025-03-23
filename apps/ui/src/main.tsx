import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import invariant from "tiny-invariant";
import App from "./App.tsx";
import "./styles/index.css";

const rootElement = document.getElementById("root");

invariant(rootElement, 'No element with id "root" found.');

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
