import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';
import { useUI } from '@/store/ui';
import './index.css';

const applyTheme = (t: string) => document.documentElement.classList.toggle('dark', t === 'dark');
applyTheme(useUI.getState().theme);
useUI.subscribe((s) => applyTheme(s.theme));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity, refetchOnWindowFocus: false, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);