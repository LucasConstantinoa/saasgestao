import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { TrafficFlowProvider } from './context/TrafficFlowContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TrafficFlowProvider>
      <App />
    </TrafficFlowProvider>
  </StrictMode>,
);
