/**
 * Initial Zones Data
 * 
 * Pre-defined zones that match the zones used in mockData.
 * These zones are initialized when the app loads.
 * 
 * AI Note: These zones correspond to the zone regions defined in mockData.ts
 */

import { Zone } from './ZoneContext'

export const initialZones: Omit<Zone, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Zone 1 - Electronics',
    color: '#4c7dff', // primary blue
    description: 'Electronics department, aisles 11-18',
    polygon: [
      { x: 0.1, y: 0.1 },
      { x: 0.3, y: 0.1 },
      { x: 0.3, y: 0.4 },
      { x: 0.1, y: 0.4 },
      { x: 0.1, y: 0.1 }, // Close polygon
    ],
    deviceIds: [], // Will be populated based on device positions
  },
  {
    name: 'Zone 2 - Clothing',
    color: '#f97316', // accent orange
    description: 'Apparel section, aisles 23-42',
    polygon: [
      { x: 0.1, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 0.9 },
      { x: 0.1, y: 0.9 },
      { x: 0.1, y: 0.5 }, // Close polygon
    ],
    deviceIds: [],
  },
  {
    name: 'Zone 3 - Retail',
    color: '#22c55e', // success green
    description: 'Toys, Sporting Goods, Home & Garden',
    polygon: [
      { x: 0.3, y: 0.1 },
      { x: 0.6, y: 0.1 },
      { x: 0.6, y: 0.5 },
      { x: 0.3, y: 0.5 },
      { x: 0.3, y: 0.1 }, // Close polygon
    ],
    deviceIds: [],
  },
  {
    name: 'Zone 7 - Grocery',
    color: '#eab308', // warning yellow
    description: 'Grocery aisles 13-22, Meat & Seafood, Produce',
    polygon: [
      { x: 0.6, y: 0.1 },
      { x: 0.95, y: 0.1 },
      { x: 0.95, y: 0.6 },
      { x: 0.6, y: 0.6 },
      { x: 0.6, y: 0.1 }, // Close polygon
    ],
    deviceIds: [],
  },
]

