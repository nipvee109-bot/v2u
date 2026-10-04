import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Self-hosted Thai typeface (works offline; no external request)
import '@fontsource/ibm-plex-sans-thai/thai-400.css'
import '@fontsource/ibm-plex-sans-thai/thai-600.css'
import '@fontsource/ibm-plex-sans-thai/thai-700.css'
import '@fontsource/ibm-plex-sans-thai/latin-400.css'
import '@fontsource/ibm-plex-sans-thai/latin-600.css'
import '@fontsource/ibm-plex-sans-thai/latin-700.css'
// Display + numerals (V2U design system): self-hosted so the PWA works offline
import '@fontsource/bai-jamjuree/thai-600.css'
import '@fontsource/bai-jamjuree/thai-700.css'
import '@fontsource/bai-jamjuree/latin-600.css'
import '@fontsource/bai-jamjuree/latin-700.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import '@fontsource/jetbrains-mono/latin-600.css'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
