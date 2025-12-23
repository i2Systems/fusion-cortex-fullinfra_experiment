/**
 * tRPC Provider Component
 * 
 * Wraps the app with tRPC and React Query providers.
 * 
 * AI Note: Add this to your root layout to enable tRPC throughout the app.
 */

'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink, httpLink, splitLink } from '@trpc/client'
import superjson from 'superjson'
import { trpc } from './client'

function getBaseUrl() {
  if (typeof window !== 'undefined') return ''
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return `http://localhost:${process.env.PORT ?? 3000}`
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        // Split link: use non-batched link for mutations, batched for queries
        // This ensures ensureExists and other mutations are never batched
        splitLink({
          condition: (op) => {
            // Use non-batched link for ALL mutations to prevent batching issues
            const isMutation = op.type === 'mutation'
            
            // Log ensureExists calls for debugging
            if (isMutation && op.path === 'site.ensureExists' && typeof window !== 'undefined') {
              console.log('[tRPC] Routing site.ensureExists to non-batched link', {
                type: op.type,
                path: op.path,
                id: op.id,
              })
            }
            
            return isMutation
          },
          // Non-batched link for mutations (including ensureExists)
          true: httpLink({
            url: `${getBaseUrl()}/api/trpc`,
            transformer: superjson,
          }),
          // Batched link for queries only
          false: httpBatchLink({
            url: `${getBaseUrl()}/api/trpc`,
            transformer: superjson,
          }),
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}

