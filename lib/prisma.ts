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

// Transaction pooler doesn't support PREPARE statements
// Add ?pgbouncer=true to disable prepared statements when using pooler
// Also add SSL mode and connection limit for serverless environments
const databaseUrl = process.env.DATABASE_URL
const poolerUrl = databaseUrl?.includes('pooler.supabase.com') 
  ? `${databaseUrl}${databaseUrl.includes('?') ? '&' : '?'}pgbouncer=true&sslmode=require&connection_limit=1`
  : databaseUrl

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: poolerUrl,
    },
  },
})

// In serverless environments, we need to handle connection pooling differently
// The connection pool will be managed by the database provider (Supabase)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

