import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from '@/App';
import './index.css';
import { TrafficFlowProvider } from '@/context/TrafficFlowContext';
import { ToastProvider } from '@/components/Toast';
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <TrafficFlowProvider>
          <App />
        </TrafficFlowProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
