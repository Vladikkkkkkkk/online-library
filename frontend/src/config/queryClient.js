import { QueryClient } from '@tanstack/react-query';

// Create React Query client - export for use in authStore and App
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

