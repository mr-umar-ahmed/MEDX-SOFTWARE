import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startSyncEngine } from './core/sync'
import { initWindowSync } from './core/windowSync'
import { IS_DISPLAY_WINDOW } from './lib/windowMode'

// Live queue sync between windows (main ↔ counter display)
initWindowSync();

// Background engines (cloud sync, booking pull, heartbeat) run only in the
// main window — the counter display is a passive, read-only screen.
if (!IS_DISPLAY_WINDOW) {
  startSyncEngine();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
