import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Gallery } from "./ui/Gallery.tsx";

const gallery = import.meta.env.DEV && location.search.includes("gallery");
createRoot(document.getElementById("root")!).render(
  gallery ? <Gallery /> : <App />,
);
