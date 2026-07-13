import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { applyTheme, getStoredTheme } from './lib/theme.js'

// Applied before the first React render so there's no flash of the wrong
// theme while the app boots.
applyTheme(getStoredTheme())

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
