'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,   // 5 min — data stays fresh, no refetch on tab switch
        gcTime: 10 * 60 * 1000,     // 10 min — keep in memory after unmount
        retry: 1,
        refetchOnWindowFocus: false, // stop refetching every time user clicks back to tab
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
