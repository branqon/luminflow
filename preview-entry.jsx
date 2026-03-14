import React from "react";
import { createRoot } from "react-dom/client";
import MusicalWavesV2 from "./musical-waves-v2.jsx";

const rootEl = document.getElementById("root");

if (!rootEl) {
  throw new Error("Missing #root element");
}

createRoot(rootEl).render(<MusicalWavesV2 />);
