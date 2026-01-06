import { describe, it, expect } from 'vitest'
import { arrangeDevicesInZone, calculateAlignmentUpdates } from './arrangement'

// Mock isFixtureType since it's imported
// But wait, vitest will use the real module if available.
// The real module is simple enough.

describe('arrangement', () => {
    describe('arrangeDevicesInZone', () => {
        const zone = {
            id: 'z1',
            name: 'Test Zone',
            polygon: [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 1, y: 1 },
                { x: 0, y: 1 }
            ]
        }

        it('should return empty array for 0 devices', () => {
            const updates = arrangeDevicesInZone([], zone)
            expect(updates).toEqual([])
        })

        it('should arrange 1 device in center', () => {
            const updates = arrangeDevicesInZone([{ id: 'd1' }], zone, 0) // 0 padding for simple math
            // width 1, height 1. 1x1 grid.
            // spacingX = 1 / (1+1) = 0.5
            // spacingY = 1 / (1+1) = 0.5
            // x = minX + spacingX * 1 = 0 + 0.5 = 0.5
            // y = minY + spacingY * 1 = 0 + 0.5 = 0.5
            expect(updates).toHaveLength(1)
            expect(updates[0].updates.x).toBeCloseTo(0.5)
            expect(updates[0].updates.y).toBeCloseTo(0.5)
            expect(updates[0].updates.zone).toBe('Test Zone')
        })

        it('should arrange 4 devices in 2x2 grid', () => {
            const devices = [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }, { id: 'd4' }]
            const updates = arrangeDevicesInZone(devices, zone, 0)

            // Grid cols = 2, rows = 2.
            // spacingX = 1/3 = 0.333
            // spacingY = 1/3 = 0.333
            // d1(0,0): x=0.33, y=0.33
            // d2(1,0): x=0.66, y=0.33
            // d3(0,1): x=0.33, y=0.66
            // d4(1,1): x=0.66, y=0.66

            expect(updates).toHaveLength(4)
            expect(updates[0].updates.x).toBeCloseTo(0.333)
            expect(updates[0].updates.y).toBeCloseTo(0.333)
            expect(updates[3].updates.x).toBeCloseTo(0.666)
            expect(updates[3].updates.y).toBeCloseTo(0.666)
        })
    })

    // Skip orientation until we can mock or ensure DeviceType strings work
})
