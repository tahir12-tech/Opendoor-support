import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import './styles/portal.css'; // design system, ported verbatim (all :root tokens preserved)

import { App } from './App';
import { SessionProvider } from './session/SessionContext';
import { ToastProvider } from './components/ui/Toast';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);
