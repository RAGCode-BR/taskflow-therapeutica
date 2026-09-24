import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { OFFLINE_CACHE_MAX_AGE } from "./lib/offline-user-storage";

export const getRouter = (basepath?: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Precisa ser >= ao tempo do cache offline: uma consulta coletada sai
        // também do IndexedDB e a tela ficaria vazia no modo avião.
        gcTime: OFFLINE_CACHE_MAX_AGE,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    ...(basepath ? { basepath } : {}),
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPreload: "intent",
  });

  return router;
};
