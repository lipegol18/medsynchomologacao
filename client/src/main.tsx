import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
import "@/lib/i18n"; // Importando as configurações de i18n

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Toaster />
  </>
);
