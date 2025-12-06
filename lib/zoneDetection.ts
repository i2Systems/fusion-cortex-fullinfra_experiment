/**
 * Zone Detection Utility
 * 
 * Automatically groups devices into zones based on their spatial clustering.
 * Limits to maximum 10 zones, grouping devices into larger logical areas.
 * 
 * AI Note: This analyzes device positions and groups them into logical zones.
 */

import { Device } from './mockData'
import { Zone } from './ZoneContext'

const ZONE_COLORS = [
  '#4c7dff', // primary blue
  '#f97316', // accent orange
  '#22c55e', // success green
  '#eab308', // warning yellow
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#10b981', // emerald
  '#6366f1', // indigo
]

const MAX_ZONES = 12

interface DeviceCluster {
  devices: Device[]
  centerX: number
  centerY: number
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/**
 * Groups devices into zones based on their spatial proximity
 * Limits to MAX_ZONES (12) zones maximum - simple spatial clustering for demo
 */
export function detectZonesFromDevices(devices: Device[]): Omit<Zone, 'id' | 'createdAt' | 'updatedAt'>[] {
  // Filter devices that have positions
  const devicesWithPositions = devices.filter(d => d.x !== undefined && d.y !== undefined)
  
  if (devicesWithPositions.length === 0) {
    return []
  }

  // Simple approach: Just do spatial clustering and limit to 12 zones
  // Use large grid size to create fewer, larger zones
  const clusters = spatialClustering(devicesWithPositions, 0.4) // Large grid = fewer zones
  
  // Always limit to MAX_ZONES by merging
  let finalClusters = clusters
  if (clusters.length > MAX_ZONES) {
    // Sort by size and merge smallest into largest
    finalClusters = clusters.sort((a, b) => b.devices.length - a.devices.length)
    
    // Keep top MAX_ZONES and merge the rest
    const keepClusters = finalClusters.slice(0, MAX_ZONES)
    const mergeClusters = finalClusters.slice(MAX_ZONES)
    
    // Distribute smaller clusters across the keep clusters (round-robin)
    mergeClusters.forEach((cluster, idx) => {
      const targetCluster = keepClusters[idx % keepClusters.length]
      targetCluster.devices.push(...cluster.devices)
    })
    
    // Recalculate bounds for all clusters
    keepClusters.forEach(cluster => {
      const positions = cluster.devices.map(d => ({ x: d.x!, y: d.y! }))
      cluster.minX = Math.min(...positions.map(p => p.x))
      cluster.maxX = Math.max(...positions.map(p => p.x))
      cluster.minY = Math.min(...positions.map(p => p.y))
      cluster.maxY = Math.max(...positions.map(p => p.y))
      cluster.centerX = (cluster.minX + cluster.maxX) / 2
      cluster.centerY = (cluster.minY + cluster.maxY) / 2
    })
    
    finalClusters = keepClusters
  }

  
  // Create zones from clusters
  return finalClusters.map((cluster, index) => {
    const padding = 0.02
    const polygon = [
      { x: Math.max(0, cluster.minX - padding), y: Math.max(0, cluster.minY - padding) },
      { x: Math.min(1, cluster.maxX + padding), y: Math.max(0, cluster.minY - padding) },
      { x: Math.min(1, cluster.maxX + padding), y: Math.min(1, cluster.maxY + padding) },
      { x: Math.max(0, cluster.minX - padding), y: Math.min(1, cluster.maxY + padding) },
      { x: Math.max(0, cluster.minX - padding), y: Math.max(0, cluster.minY - padding) }, // Close polygon
    ]

    // Try to infer zone name from device locations
    const locationNames = cluster.devices
      .map(d => d.location)
      .filter(loc => loc)
      .map(loc => {
        // Extract department/area from location string
        const parts = loc.split(' - ')
        return parts[0] || parts[1] || 'Area'
      })
    
    const mostCommonLocation = locationNames.length > 0
      ? locationNames.reduce((a, b, _, arr) => 
          arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
        )
      : 'Area'

    return {
      name: `Zone ${index + 1} - ${mostCommonLocation}`,
      color: ZONE_COLORS[index % ZONE_COLORS.length],
      description: `${cluster.devices.length} devices in ${mostCommonLocation}`,
      polygon,
      deviceIds: cluster.devices.map(d => d.id),
    }
  })
}

/**
 * Simple spatial clustering using grid-based approach
 * Uses larger grid size to create fewer, larger clusters
 */
function spatialClustering(devices: Device[], gridSize: number = 0.25): DeviceCluster[] {
  const clusters: DeviceCluster[] = []
  const processed = new Set<string>()

  devices.forEach(device => {
    if (processed.has(device.id) || device.x === undefined || device.y === undefined) {
      return
    }

    // Find all nearby devices
    const cluster: Device[] = [device]
    processed.add(device.id)

    devices.forEach(other => {
      if (
        processed.has(other.id) ||
        other.x === undefined ||
        other.y === undefined
      ) {
        return
      }

      const distance = Math.sqrt(
        Math.pow(device.x! - other.x!, 2) + Math.pow(device.y! - other.y!, 2)
      )

      if (distance < gridSize) {
        cluster.push(other)
        processed.add(other.id)
      }
    })

    // Calculate cluster bounds
    const positions = cluster.map(d => ({ x: d.x!, y: d.y! }))
    const minX = Math.min(...positions.map(p => p.x))
    const maxX = Math.max(...positions.map(p => p.x))
    const minY = Math.min(...positions.map(p => p.y))
    const maxY = Math.max(...positions.map(p => p.y))

    clusters.push({
      devices: cluster,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      minX,
      maxX,
      minY,
      maxY,
    })
  })

  return clusters
}

