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
    color: '#22c55e', // success green
    description: 'Stockroom, Pharmacy/Health & Beauty, and Home sections',
    polygon: [
      { x: 0.0, y: 0.0 },
      { x: 0.25, y: 0.0 },
      { x: 0.25, y: 0.4 },
      { x: 0.15, y: 0.4 },
      { x: 0.15, y: 0.5 },
      { x: 0.0, y: 0.5 },
      { x: 0.0, y: 0.0 }, // Close polygon
    ],
    deviceIds: [],
  },
  {
    name: 'Pickup & Delivery',
    color: '#4c7dff', // primary blue
    description: 'Pickup & Delivery, Electronics, and Sporting Goods',
    polygon: [
      { x: 0.25, y: 0.0 },
      { x: 0.55, y: 0.0 },
      { x: 0.55, y: 0.4 },
      { x: 0.45, y: 0.4 },
      { x: 0.45, y: 0.35 },
      { x: 0.25, y: 0.35 },
      { x: 0.25, y: 0.0 }, // Close polygon
    ],
    deviceIds: [],
  },
  {
    name: 'Apparel & Clothing',
    color: '#f97316', // accent orange
    description: 'All Apparel sections including aisles 1-10, 11-18, 23-31, 32-38, 39-49, 50-52, 53-60',
    polygon: [
      { x: 0.0, y: 0.5 },
      { x: 0.35, y: 0.5 },
      { x: 0.35, y: 0.75 },
      { x: 0.25, y: 0.75 },
      { x: 0.25, y: 0.95 },
      { x: 0.0, y: 0.95 },
      { x: 0.0, y: 0.5 }, // Close polygon
    ],
    deviceIds: [],
  },
  {
    name: 'Toys & Sporting Goods',
    color: '#a855f7', // purple
    description: 'Toys sections with aisles 11-18, 61-67',
    polygon: [
      { x: 0.35, y: 0.4 },
      { x: 0.6, y: 0.4 },
      { x: 0.6, y: 0.75 },
      { x: 0.5, y: 0.75 },
      { x: 0.5, y: 0.65 },
      { x: 0.35, y: 0.65 },
      { x: 0.35, y: 0.4 }, // Close polygon
    ],
    deviceIds: [],
  },
  {
    name: 'Grocery & Food',
    color: '#eab308', // warning yellow
    description: 'Meat & Seafood, Produce, Grocery aisles 19-22, Deli, Bakery, Main Lobby, and Stockroom',
    polygon: [
      { x: 0.6, y: 0.0 },
      { x: 1.0, y: 0.0 },
      { x: 1.0, y: 0.7 },
      { x: 0.9, y: 0.7 },
      { x: 0.9, y: 0.6 },
      { x: 0.6, y: 0.6 },
      { x: 0.6, y: 0.4 },
      { x: 0.6, y: 0.0 }, // Close polygon
    ],
    deviceIds: [],
  },
]

