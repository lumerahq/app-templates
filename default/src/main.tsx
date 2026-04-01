import { type HostPayload, isEmbedded, onInitMessage, postReadyMessage } from '@lumerahq/ui/lib';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHashHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';

import { AuthContext, type AuthContextValue } from './lib/auth';
import { routeTree } from './routeTree.gen';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const hashHistory = createHashHistory();

const router = createRouter({
  routeTree,
  history: hashHistory,
  context: {},
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const ROUTE_STORAGE_KEY = '{{projectName}}-route';

function RouteRestorer() {
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      const savedRoute = localStorage.getItem(ROUTE_STORAGE_KEY);
      if (savedRoute && savedRoute !== '/' && router.state.location.pathname === '/') {
        router.navigate({ to: savedRoute });
      }
    }

    return router.subscribe('onResolved', ({ toLocation }) => {
      localStorage.setItem(ROUTE_STORAGE_KEY, toLocation.href);
    });
  }, []);

  return null;
}

const App = () => {
  const [hostContext, setHostContext] = useState<AuthContextValue | null>(null);
  const [status, setStatus] = useState<'pending' | 'ready' | 'denied'>('pending');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standaloneDevMode =
      import.meta.env.DEV && !isEmbedded() && !!import.meta.env.VITE_DEV_API_BASE_URL;

    if (!isEmbedded() && !standaloneDevMode) {
      setStatus('denied');
      return;
    }

    const cleanup = onInitMessage((payload?: HostPayload) => {
      setHostContext({
        company: payload?.company,
        user: payload?.user,
        sessionToken: payload?.session?.token,
      });
      setStatus('ready');
    });

    postReadyMessage();
    return cleanup;
  }, []);

  if (status === 'pending') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 rounded-xl bg-gradient-to-br from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] flex items-center justify-center text-white font-semibold text-lg shadow-sm animate-pulse">
            L
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  if (status === 'denied' || !hostContext) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="inline-flex size-12 rounded-xl bg-muted items-center justify-center mb-2">
            <span className="text-2xl font-semibold text-muted-foreground">403</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Access denied, this app can only be accessed from within Lumera.
          </p>
        </div>
      </main>
    );
  }

  return (
    <AuthContext.Provider value={hostContext}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <RouteRestorer />
        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    </AuthContext.Provider>
  );
};

const rootElement = document.getElementById('app');
if (rootElement && !rootElement.innerHTML) {
  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
