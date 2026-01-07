'use client'

import { useCallback, useRef } from 'react'
import { trpc } from '@/lib/trpc/client'
import { useSite } from '@/lib/SiteContext'
import type { Device } from '@/lib/mockData'

/**
 * useDeviceMutations - Encapsulates all device mutation operations
 * 
 * Provides optimistic update functions for CRUD operations on devices.
 * All mutations automatically invalidate the device list query on success.
 */
export interface DeviceMutations {
    /** Add a new device */
    addDevice: (device: Device) => Promise<void>
    /** Update a single device */
    updateDevice: (deviceId: string, updates: Partial<Device>) => Promise<void>
    /** Update device position (debounced) */
    updateDevicePosition: (deviceId: string, x: number, y: number) => void
    /** Update multiple devices at once */
    updateMultipleDevices: (updates: Array<{ deviceId: string; updates: Partial<Device> }>) => Promise<void>
    /** Remove a device */
    removeDevice: (deviceId: string) => Promise<void>
    /** Whether any mutation is in progress */
    isLoading: boolean
}

export function useDeviceMutations(
    /** Callback for optimistic UI updates */
    onOptimisticUpdate?: (updater: (devices: Device[]) => Device[]) => void
): DeviceMutations {
    const { activeSiteId } = useSite()
    const utils = trpc.useContext()

    // Debounce timer for position updates
    const positionUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Mutations
    const createDeviceMutation = trpc.device.create.useMutation({
        onSuccess: () => {
            utils.device.list.invalidate({ siteId: activeSiteId || '' })
        },
    })

    const updateDeviceMutation = trpc.device.update.useMutation({
        onSuccess: () => {
            utils.device.list.invalidate({ siteId: activeSiteId || '' })
        },
    })

    const deleteDeviceMutation = trpc.device.delete.useMutation({
        onSuccess: () => {
            utils.device.list.invalidate({ siteId: activeSiteId || '' })
        },
    })

    const addDevice = useCallback(async (device: Device) => {
        if (!activeSiteId) return

        // Optimistic update
        onOptimisticUpdate?.(devices => {
            const exists = devices.some(d => d.id === device.id || d.serialNumber === device.serialNumber)
            if (exists) return devices
            return [...devices, device]
        })

        try {
            if (!device.type) {
                throw new Error('Device type is required')
            }

            await createDeviceMutation.mutateAsync({
                siteId: activeSiteId,
                deviceId: device.deviceId,
                serialNumber: device.serialNumber,
                type: device.type,
                status: device.status,
                signal: device.signal,
                battery: device.battery,
                x: device.x,
                y: device.y,
                orientation: device.orientation,
                warrantyStatus: device.warrantyStatus,
                warrantyExpiry: device.warrantyExpiry,
                components: device.components?.map(comp => ({
                    componentType: comp.componentType,
                    componentSerialNumber: comp.componentSerialNumber,
                    warrantyStatus: comp.warrantyStatus,
                    warrantyExpiry: comp.warrantyExpiry,
                    buildDate: comp.buildDate,
                })),
            })
        } catch (error) {
            console.error('Failed to create device:', error)
            // Revert optimistic update
            onOptimisticUpdate?.(devices => devices.filter(d => d.id !== device.id))
        }
    }, [activeSiteId, createDeviceMutation, onOptimisticUpdate])

    const updateDevice = useCallback(async (deviceId: string, updates: Partial<Device>) => {
        // Optimistic update
        onOptimisticUpdate?.(devices =>
            devices.map(device =>
                device.id === deviceId ? { ...device, ...updates } : device
            )
        )

        try {
            const dbUpdates: Record<string, unknown> = {}
            if (updates.deviceId !== undefined) dbUpdates.deviceId = updates.deviceId
            if (updates.serialNumber !== undefined) dbUpdates.serialNumber = updates.serialNumber
            if (updates.type !== undefined) dbUpdates.type = updates.type
            if (updates.status !== undefined) dbUpdates.status = updates.status
            if (updates.signal !== undefined) dbUpdates.signal = updates.signal
            if (updates.battery !== undefined) dbUpdates.battery = updates.battery
            if (updates.x !== undefined) dbUpdates.x = updates.x
            if (updates.y !== undefined) dbUpdates.y = updates.y
            if (updates.orientation !== undefined) dbUpdates.orientation = updates.orientation
            if (updates.warrantyStatus !== undefined) dbUpdates.warrantyStatus = updates.warrantyStatus
            if (updates.warrantyExpiry !== undefined) dbUpdates.warrantyExpiry = updates.warrantyExpiry

            await updateDeviceMutation.mutateAsync({
                id: deviceId,
                ...dbUpdates,
            })
        } catch (error) {
            console.error('Failed to update device:', error)
            // Revert by refetching
            utils.device.list.invalidate({ siteId: activeSiteId || '' })
        }
    }, [updateDeviceMutation, utils, activeSiteId, onOptimisticUpdate])

    const updateDevicePosition = useCallback((deviceId: string, x: number, y: number) => {
        // Optimistic update (immediate UI feedback)
        onOptimisticUpdate?.(devices =>
            devices.map(device =>
                device.id === deviceId ? { ...device, x, y } : device
            )
        )

        // Debounce database updates
        if (positionUpdateTimeoutRef.current) {
            clearTimeout(positionUpdateTimeoutRef.current)
        }

        positionUpdateTimeoutRef.current = setTimeout(async () => {
            try {
                await updateDeviceMutation.mutateAsync({
                    id: deviceId,
                    x,
                    y,
                })
            } catch (error) {
                console.error('Failed to update device position:', error)
                utils.device.list.invalidate({ siteId: activeSiteId || '' })
            }
        }, 1000)
    }, [updateDeviceMutation, utils, activeSiteId, onOptimisticUpdate])

    const updateMultipleDevices = useCallback(async (updates: Array<{ deviceId: string; updates: Partial<Device> }>) => {
        // Optimistic update
        onOptimisticUpdate?.(devices =>
            devices.map(device => {
                const update = updates.find(u => u.deviceId === device.id)
                return update ? { ...device, ...update.updates } : device
            })
        )

        try {
            await Promise.all(
                updates.map(async ({ deviceId, updates: deviceUpdates }) => {
                    const dbUpdates: Record<string, unknown> = {}
                    if (deviceUpdates.x !== undefined) dbUpdates.x = deviceUpdates.x
                    if (deviceUpdates.y !== undefined) dbUpdates.y = deviceUpdates.y
                    if (deviceUpdates.orientation !== undefined) dbUpdates.orientation = deviceUpdates.orientation
                    if (deviceUpdates.status !== undefined) dbUpdates.status = deviceUpdates.status
                    if (deviceUpdates.signal !== undefined) dbUpdates.signal = deviceUpdates.signal
                    if (deviceUpdates.battery !== undefined) dbUpdates.battery = deviceUpdates.battery

                    return updateDeviceMutation.mutateAsync({
                        id: deviceId,
                        ...dbUpdates,
                    })
                })
            )
        } catch (error) {
            console.error('Failed to update multiple devices:', error)
            utils.device.list.invalidate({ siteId: activeSiteId || '' })
        }
    }, [updateDeviceMutation, utils, activeSiteId, onOptimisticUpdate])

    const removeDevice = useCallback(async (deviceId: string) => {
        // Optimistic update
        onOptimisticUpdate?.(devices => devices.filter(device => device.id !== deviceId))

        try {
            await deleteDeviceMutation.mutateAsync({ id: deviceId })
        } catch (error) {
            console.error('Failed to delete device:', error)
            utils.device.list.invalidate({ siteId: activeSiteId || '' })
        }
    }, [deleteDeviceMutation, utils, activeSiteId, onOptimisticUpdate])

    return {
        addDevice,
        updateDevice,
        updateDevicePosition,
        updateMultipleDevices,
        removeDevice,
        isLoading: createDeviceMutation.isPending || updateDeviceMutation.isPending || deleteDeviceMutation.isPending,
    }
}
