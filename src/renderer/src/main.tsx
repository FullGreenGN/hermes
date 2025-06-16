import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { HashRouter, Route, Routes } from "react-router-dom"
import ConfigPage from "@/pages/ConfigPage"
import ToastProvider from '@/components/ToastProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route path={"/"} element={<App />} />
          <Route path={"/config"} element={<ConfigPage />} />
        </Routes>
      </HashRouter>
    </ToastProvider>
  </StrictMode>
)
