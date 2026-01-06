/**
 * Pure geometric functions for map calculations
 */

export interface Point {
    x: number
    y: number
}

export interface PolygonZone {
    id: string
    polygon: Point[]
    name?: string
    // Allow other properties to pass through
    [key: string]: any
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x
        const yi = polygon[i].y
        const xj = polygon[j].x
        const yj = polygon[j].y

        const intersect = ((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)
        if (intersect) inside = !inside
    }
    return inside
}

/**
 * Find which zone contains a device position
 */
export function findZoneForDevice<T extends PolygonZone>(
    device: Partial<Point>,
    zones: T[]
): T | null {
    if (device.x === undefined || device.y === undefined) return null

    const point = { x: device.x, y: device.y }

    for (const zone of zones) {
        if (pointInPolygon(point, zone.polygon)) {
            return zone
        }
    }
    return null
}
