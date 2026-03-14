import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { bootstrapSupabaseConfig } from './services/supabase';

import { useStore } from './store/useStore';

window.useStore = useStore;

async function startApp() {
  await bootstrapSupabaseConfig();
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

startApp();
