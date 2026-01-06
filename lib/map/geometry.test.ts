import { describe, it, expect } from 'vitest'
import { pointInPolygon, findZoneForDevice, PolygonZone } from './geometry'

describe('geometry', () => {
    describe('pointInPolygon', () => {
        const square = [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 }
        ]

        it('should return true for point inside polygon', () => {
            expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true)
        })

        it('should return false for point outside polygon', () => {
            expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false)
            expect(pointInPolygon({ x: 5, y: -5 }, square)).toBe(false)
        })

        it('should handle complex shapes', () => {
            // L-shape
            const lShape = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 5 },
                { x: 5, y: 5 },
                { x: 5, y: 10 },
                { x: 0, y: 10 }
            ]
            expect(pointInPolygon({ x: 2, y: 2 }, lShape)).toBe(true) // Bottom leg
            expect(pointInPolygon({ x: 2, y: 8 }, lShape)).toBe(true) // Top leg
            expect(pointInPolygon({ x: 8, y: 2 }, lShape)).toBe(true) // Side leg
            expect(pointInPolygon({ x: 8, y: 8 }, lShape)).toBe(false) // Empty corner
        })
    })

    describe('findZoneForDevice', () => {
        const zoneA: PolygonZone = {
            id: 'A',
            polygon: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]
        }
        const zoneB: PolygonZone = {
            id: 'B',
            polygon: [{ x: 20, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 10 }, { x: 20, y: 10 }]
        }
        const zones = [zoneA, zoneB]

        it('should find correct zone', () => {
            expect(findZoneForDevice({ x: 5, y: 5 }, zones)).toBe(zoneA)
            expect(findZoneForDevice({ x: 25, y: 5 }, zones)).toBe(zoneB)
        })

        it('should return null if no zone found', () => {
            expect(findZoneForDevice({ x: 15, y: 5 }, zones)).toBe(null)
        })

        it('should return null if device coords missing', () => {
            expect(findZoneForDevice({ x: 5 }, zones)).toBe(null)
        })
    })
})
