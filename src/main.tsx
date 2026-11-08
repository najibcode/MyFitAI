import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { offlineSyncService } from './services/offlineSyncService'

// Register Offline Gym Service Worker
offlineSyncService.register();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
