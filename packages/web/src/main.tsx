/**
 * Browser entry point
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import App from './App';
import CallAnalysisPage from './CallAnalysisPage';
import './index.css';
import CallsPage from './CallsPage';
import BranchAnalysisPage from './BranchAnalysisPage';
import NewCallPage from './NewCallPage';

const container = document.getElementById('root');

if (!container) {
  throw new Error('No #root element found in index.html.');
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/calls" element={<CallsPage />} />
        <Route path="/calls/new" element={<NewCallPage />} />
        <Route path="/calls/:callId" element={<CallAnalysisPage />} />
        <Route path="/calls/:callId/branch/:branchId" element={<BranchAnalysisPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
