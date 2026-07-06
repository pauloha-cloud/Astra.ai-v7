import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';

// Suppress ResizeObserver loop limit errors and warnings
if (typeof window !== 'undefined') {
  const isResizeObserverError = (msg: string) => {
    return msg && (
      msg.includes('ResizeObserver loop completed with undelivered notifications') ||
      msg.includes('ResizeObserver loop limit exceeded')
    );
  };

  const resizeObserverErr = (e: ErrorEvent) => {
    if (e.message && isResizeObserverError(e.message)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    } else if (e.error && e.error.message && isResizeObserverError(e.error.message)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  };

  const resizeObserverRejection = (e: PromiseRejectionEvent) => {
    if (e.reason && e.reason.message && isResizeObserverError(e.reason.message)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  };

  window.addEventListener('error', resizeObserverErr);
  window.addEventListener('unhandledrejection', resizeObserverRejection);

  // Suppress from console.error as well
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    if (args.length > 0 && typeof args[0] === 'string' && isResizeObserverError(args[0])) {
      return;
    }
    if (args.length > 0 && args[0] instanceof Error && args[0].message && isResizeObserverError(args[0].message)) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // Wrap standard ResizeObserver with requestAnimationFrame to natively prevent loop limit exceeded errors
  if (window.ResizeObserver) {
    const OriginalResizeObserver = window.ResizeObserver;
    window.ResizeObserver = class ResizeObserver extends OriginalResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        super((entries, observer) => {
          window.requestAnimationFrame(() => {
            try {
              callback(entries, observer);
            } catch (err: any) {
              if (!isResizeObserverError(err?.message)) {
                console.error(err);
              }
            }
          });
        });
      }
    };
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
