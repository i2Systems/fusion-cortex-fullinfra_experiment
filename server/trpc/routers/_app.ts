/**
 * Main tRPC App Router
 * 
 * Combines all sub-routers into a single app router.
 * 
 * AI Note: Add new routers here as you create them.
 */

import { router } from '../trpc'
import { deviceRouter } from './device'
import { zoneRouter } from './zone'
import { bacnetRouter } from './bacnet'
import { ruleRouter } from './rule'
import { siteRouter } from './site'
import { faultRouter } from './fault'

export const appRouter = router({
  device: deviceRouter,
  zone: zoneRouter,
  bacnet: bacnetRouter,
  rule: ruleRouter,
  site: siteRouter,
  fault: faultRouter,
})

export type AppRouter = typeof appRouter

