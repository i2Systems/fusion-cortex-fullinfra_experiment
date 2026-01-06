/**
 * Logic for arranging devices on the map
 */

import { isFixtureType } from '../deviceUtils'
import { DeviceType } from '../mockData'

interface Point {
    x: number
    y: number
}

interface Zone {
    id: string
    name: string
    polygon: Point[]
}

export interface DeviceUpdate {
    deviceId: string
    updates: {
        x?: number
        y?: number
        zone?: string
        orientation?: number
    }
}

/**
 * Arrange devices in a grid pattern within a zone
 */
export function arrangeDevicesInZone(
    devices: { id: string }[],
    zone: Zone,
    padding: number = 0.02
): DeviceUpdate[] {
    // Get zone bounds from polygon (polygon is in normalized 0-1 coordinates)
    const zonePoints = zone.polygon
    // Check if polygon exists/is valid
    if (!zonePoints || zonePoints.length === 0) return []

    const minX = Math.min(...zonePoints.map(p => p.x))
    const maxX = Math.max(...zonePoints.map(p => p.x))
    const minY = Math.min(...zonePoints.map(p => p.y))
    const maxY = Math.max(...zonePoints.map(p => p.y))

    // Calculate zone dimensions with padding to keep devices inside
    const zoneMinX = minX + padding
    const zoneMaxX = maxX - padding
    const zoneMinY = minY + padding
    const zoneMaxY = maxY - padding

    const zoneWidth = zoneMaxX - zoneMinX
    const zoneHeight = zoneMaxY - zoneMinY

    // Only proceed if zone has valid dimensions
    if (zoneWidth <= 0 || zoneHeight <= 0) {
        return []
    }

    // Calculate grid layout for selected devices within zone bounds
    const cols = Math.ceil(Math.sqrt(devices.length))
    const rows = Math.ceil(devices.length / cols)

    // Calculate spacing to fit devices within zone with margins
    const spacingX = zoneWidth / (cols + 1)
    const spacingY = zoneHeight / (rows + 1)

    return devices.map((device, idx) => {
        const col = idx % cols
        const row = Math.floor(idx / cols)
        // Position devices within zone bounds, starting from zoneMinX/zoneMinY
        const x = Math.max(zoneMinX, Math.min(zoneMaxX, zoneMinX + spacingX * (col + 1)))
        const y = Math.max(zoneMinY, Math.min(zoneMaxY, zoneMinY + spacingY * (row + 1)))

        return {
            deviceId: device.id,
            updates: {
                x: x,
                y: y,
                zone: zone.name
            }
        }
    })
}

/**
 * Calculate orientation updates to align devices
 */
export function calculateAlignmentUpdates(
    devices: { id: string, type: string, orientation?: number }[]
): DeviceUpdate[] {
    const fixtures = devices.filter(d => isFixtureType(d.type as DeviceType))

    if (fixtures.length === 0) return []

    const currentOrientations = fixtures.map(d => {
        const orientation = d.orientation || 0
        // Normalize to 0-360 range
        const normalized = ((orientation % 360) + 360) % 360
        // Consider 0-45 and 315-360 as horizontal (0), 45-135 as vertical (90)
        return normalized <= 45 || normalized >= 315 ? 0 : 90
    })

    // Count horizontal vs vertical
    const horizontalCount = currentOrientations.filter(o => o === 0).length
    const verticalCount = currentOrientations.filter(o => o === 90).length

    // If more horizontal, switch to vertical; otherwise switch to horizontal
    const targetOrientation = horizontalCount >= verticalCount ? 90 : 0

    return fixtures.map(d => ({
        deviceId: d.id,
        updates: { orientation: targetOrientation }
    }))
}
