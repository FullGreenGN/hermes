import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import {HashRouter, Route, Routes} from "react-router-dom";
import ConfigPage from "@/pages/ConfigPage";

createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <Routes>
      <Route path={"/"} element={<StrictMode><App /></StrictMode>} />
      <Route path={"/config"} element={<StrictMode><ConfigPage/></StrictMode>} />
    </Routes>
  </HashRouter>
)
