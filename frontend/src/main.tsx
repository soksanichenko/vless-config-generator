import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/global.css'
import { App } from './App'
import { LangProvider } from './i18n/LangContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LangProvider>
      <App />
    </LangProvider>
  </React.StrictMode>,
)
