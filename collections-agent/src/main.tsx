import { type HostPayload, isEmbedded, onInitMessage, postReadyMessage } from '@lumerahq/ui/lib';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHashHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { createContext, StrictMode, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';

import { routeTree } from './routeTree.gen';
import '@lumerahq/ui/styles.css';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

// Use hash history so route persists across iframe refreshes
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

const ROUTE_STORAGE_KEY = 'collections-agent-route';

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
      localStorage.setItem(ROUTE_STORAGE_KEY, toLocation.pathname);
    });
  }, []);

  return null;
}

type AuthContextValue = {
  company?: { id: string; name?: string; apiName?: string };
  user?: { id: string; name: string; email: string; role?: string };
  sessionToken?: string;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

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
      <main className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <p>Authenticating...</p>
      </main>
    );
  }

  if (status === 'denied' || !hostContext) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-4 rounded-xl border border-slate-700/60 bg-slate-800/70 px-8 py-10">
          <p className="text-sm uppercase tracking-widest text-slate-400">Error</p>
          <p className="text-6xl font-semibold">403</p>
          <p className="text-sm text-slate-300">Access Denied</p>
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
    </StrictMode>
  );
}
