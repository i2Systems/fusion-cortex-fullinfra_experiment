/**
 * Prisma Client Singleton
 * 
 * Creates a single Prisma client instance for use across the application.
 * Prevents multiple instances in development with hot reloading.
 * 
 * AI Note: Import this in tRPC routers and other server-side code.
 * 
 * Configured for serverless environments (Vercel) to avoid prepared statement conflicts.
 */

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

// In serverless environments, we need to handle connection pooling differently
// The connection pool will be managed by the database provider (Supabase)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

