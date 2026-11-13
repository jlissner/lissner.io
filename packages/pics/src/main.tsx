import "./index.css";
import App from "./app/app";
import { registerServiceWorker } from "./lib/service-worker";
import { initApp } from "@lissner/ui-utils";

registerServiceWorker();

initApp(<App />);
