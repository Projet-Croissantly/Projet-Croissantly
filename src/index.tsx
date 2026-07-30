import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Le "as HTMLElement" est la syntaxe propre qui rassure TypeScript
const rootElement = document.getElementById("root") as HTMLElement;
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
