/**
 * The browser entry point. Vite loads this from the <script> tag in index.html.
 * Three steps, and this file never needs to change again.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('root');

/* `getElementById` can return null, and strict TypeScript makes us prove it did
   not. A clear error here beats React's cryptic one later. */
if (!container) {
  throw new Error('No #root element found in index.html.');
}

/* StrictMode is development-only. It deliberately renders everything TWICE to
   expose accidental side effects - so if a console.log appears twice, that is
   why. It does not happen in the production build. */
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
