/**
 * Initial Zones Data
 * 
 * Pre-defined zones that match the actual floor plan layout.
 * These zones are initialized when the app loads.
 * 
 * AI Note: These zones correspond to the actual room regions defined in mockData.ts
 * and match the Walmart Supercenter floor plan structure.
 */

import { Zone } from './ZoneContext'

export const initialZones: Omit<Zone, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Electronics & Technology',
    color: '#4c7dff', // primary blue
    description: 'Electronics Center, Electronics Bottom, and related technology sections',
    polygon: [
      { x: 0.1, y: 0.05 },
      { x: 0.6, y: 0.05 },
      { x: 0.6, y: 0.85 },
      { x: 0.1, y: 0.85 },
      { x: 0.1, y: 0.05 }, // Close polygon
    ],
    deviceIds: [], // Will be populated based on device positions
  },
  {
    name: 'Apparel & Clothing',
    color: '#f97316', // accent orange
    description: 'All Apparel sections including Top, Center, and Bottom areas',
    polygon: [
      { x: 0.05, y: 0.2 },
      { x: 0.3, y: 0.2 },
      { x: 0.3, y: 0.9 },
      { x: 0.05, y: 0.9 },
      { x: 0.05, y: 0.2 }, // Close polygon
    ],
    deviceIds: [],
  },
  {
    name: 'Grocery & Food',
    color: '#eab308', // warning yellow
    description: 'Grocery aisles, Produce, Meat & Seafood, Deli, Bakery, and Main Lobby',
    polygon: [
      { x: 0.6, y: 0.05 },
      { x: 0.98, y: 0.05 },
      { x: 0.98, y: 0.7 },
      { x: 0.6, y: 0.7 },
      { x: 0.6, y: 0.05 }, // Close polygon
    ],
    deviceIds: [],
  },
  {
    name: 'Home & Garden',
    color: '#22c55e', // success green
    description: 'Home sections, Home Center, and related home goods areas',
    polygon: [
      { x: 0.25, y: 0.05 },
      { x: 0.42, y: 0.05 },
      { x: 0.42, y: 0.5 },
      { x: 0.25, y: 0.5 },
      { x: 0.25, y: 0.05 }, // Close polygon
    ],
    deviceIds: [],
  },
  {
    name: 'Toys & Sporting Goods',
    color: '#a855f7', // purple
    description: 'Toys sections, Sporting Goods, and recreational areas',
    polygon: [
      { x: 0.28, y: 0.1 },
      { x: 0.6, y: 0.1 },
      { x: 0.6, y: 0.85 },
      { x: 0.28, y: 0.85 },
      { x: 0.28, y: 0.1 }, // Close polygon
    ],
    deviceIds: [],
  },
]

