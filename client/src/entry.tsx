import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyPerformanceTierClass, detectPerformanceTier } from "./lib/performanceTier";

applyPerformanceTierClass(detectPerformanceTier());

createRoot(document.getElementById("root")!).render(<App />);
