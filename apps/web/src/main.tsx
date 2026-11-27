import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '../../../src/index.css';
import App from '../../../src/App.tsx';

/* Entrée du Client 1 : Site Web SAVAA (inclut DesktopNav et Back-Office /admin). */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App target="web" />
  </StrictMode>,
);
