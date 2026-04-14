import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 10000,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // Core React - keep in main to avoid context issues
              if (id.includes('react/') || id.includes('react-dom/') || id.includes('scheduler/') || id.includes('react-is/')) {
                return undefined;
              }
              
              // Large libraries
              if (id.includes('@monaco-editor')) return 'monaco';
              if (id.includes('lucide-react')) return 'icons';
              if (id.includes('recharts')) return 'charts';
              if (id.includes('jspdf')) return 'pdf-core';
              if (id.includes('html2canvas')) return 'pdf-utils';
              if (id.includes('sql.js')) return 'sql';
              if (id.includes('motion')) return 'motion';
              if (id.includes('@google/genai')) return 'ai';
              
              // Framework & Utils
              if (id.includes('react-router')) return 'router';
              if (id.includes('axios')) return 'network';
              if (id.includes('date-fns')) return 'date-utils';
              if (id.includes('styled-components')) return 'styles';
              
              return 'vendor';
            }
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
