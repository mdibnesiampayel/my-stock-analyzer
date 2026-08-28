import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "./index.css";
import App from "./App";
import { StoreProvider } from "./lib/store";
import { MoneyProvider } from "./lib/money";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StoreProvider>
      <MoneyProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MoneyProvider>
    </StoreProvider>
  </React.StrictMode>
);
