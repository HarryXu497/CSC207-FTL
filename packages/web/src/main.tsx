/**
 * Browser entry point
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import CallAnalysisPage from './CallAnalysisPage';

const container = document.getElementById('root');

if (!container) {
  throw new Error('No #root element found in index.html.');
}

createRoot(container).render(
  <StrictMode>
    <CallAnalysisPage />
  </StrictMode>,
);
