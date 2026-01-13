import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { DeviceStatus } from '@prisma/client';

export const notificationRouter = router({
    list: publicProcedure
        .input(z.object({
            siteId: z.string().nullable().optional(),
        }))
        .query(async ({ input }) => {
            const { siteId } = input;
            const notifications = [];

            // 1. Get unresolved faults
            const faults = await prisma.fault.findMany({
                where: {
                    resolved: false,
                    Device: siteId ? { siteId } : undefined,
                },
                select: {
                    id: true,
                    deviceId: true,
                    faultType: true,
                    description: true,
                    detectedAt: true,
                    Device: {
                        select: {
                            deviceId: true,
                            siteId: true,
                            Site: { select: { name: true } },
                        },
                    },
                },
                orderBy: { detectedAt: 'desc' },
                take: 20, // Limit to recent faults
            });

            for (const fault of faults) {
                notifications.push({
                    id: `fault-${fault.id}`,
                    type: 'fault',
                    title: `${fault.faultType.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')} Detected`,
                    message: `${fault.description} (Device: ${fault.Device.deviceId})`,
                    timestamp: fault.detectedAt,
                    read: false,
                    link: `/faults?id=${fault.id}&siteId=${fault.Device.siteId}`, // Assuming /faults can handle query param, or just /faults
                    siteId: fault.Device.siteId,
                });
            }

            // 2. Get Warranty Issues (Expired or Expiring in 30 days)
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

            const warrantyDevices = await prisma.device.findMany({
                where: {
                    siteId: siteId || undefined,
                    AND: [
                        { warrantyExpiry: { not: null } },
                        { warrantyExpiry: { lte: thirtyDaysFromNow } },
                    ],
                },
                select: {
                    id: true,
                    deviceId: true,
                    siteId: true,
                    warrantyExpiry: true,
                },
                orderBy: {
                    warrantyExpiry: 'asc', // Show most urgent first
                },
                take: 50, // Increase limit to ensure coverage across sites
            });

            for (const device of warrantyDevices) {
                if (!device.warrantyExpiry) continue;
                const isExpired = device.warrantyExpiry < new Date();
                notifications.push({
                    id: `warranty-${device.id}`,
                    type: 'warranty',
                    title: isExpired ? 'Warranty Expired' : 'Warranty Expiring Soon',
                    message: `Device ${device.deviceId} warranty ${isExpired ? 'expired' : 'expires'} on ${device.warrantyExpiry.toLocaleDateString()}.`,
                    timestamp: device.warrantyExpiry,
                    read: false,
                    link: `/lookup?id=${device.id}&siteId=${device.siteId}`,
                    siteId: device.siteId,
                });
            }

            // 3. Device Health (Low Signal or Offline)
            const healthDevices = await prisma.device.findMany({
                where: {
                    siteId: siteId || undefined,
                    OR: [
                        { signal: { lt: 20, gt: 0 } },
                        { status: DeviceStatus.MISSING },
                    ],
                },
                select: {
                    id: true,
                    deviceId: true,
                    siteId: true,
                    status: true,
                    signal: true,
                    updatedAt: true,
                },
                orderBy: {
                    updatedAt: 'desc', // Show most recently updated
                },
                take: 50, // Increase limit
            });

            for (const device of healthDevices) {
                let title = 'Device Issue';
                let message = `Device ${device.deviceId} requires attention.`;

                if (device.status === DeviceStatus.MISSING) {
                    title = 'Device Missing';
                    message = `Device ${device.deviceId} is reported as MISSING.`;
                } else if (device.signal && device.signal < 20) {
                    title = 'Weak Signal';
                    message = `Device ${device.deviceId} has poor signal strength (${device.signal}%).`;
                }

                notifications.push({
                    id: `health-${device.id}`,
                    type: 'device',
                    title: title,
                    message: message,
                    timestamp: device.updatedAt,
                    read: false,
                    link: `/faults?id=${device.id}&siteId=${device.siteId}`,
                    siteId: device.siteId,
                });
            }

            // 4. Get Firmware Update Notifications
            const firmwareCampaigns = await prisma.firmwareUpdate.findMany({
                where: {
                    status: {
                        in: ['IN_PROGRESS', 'COMPLETED', 'FAILED'],
                    },
                    ...(siteId ? { siteId } : {}),
                },
                include: {
                    FirmwareDeviceUpdate: {
                        where: {
                            status: 'FAILED',
                        },
                        take: 10,
                        include: {
                            Device: {
                                select: {
                                    deviceId: true,
                                    siteId: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { updatedAt: 'desc' },
                take: 10,
            });

            for (const campaign of firmwareCampaigns) {
                // Campaign status notifications
                if (campaign.status === 'COMPLETED' && campaign.completedAt) {
                    notifications.push({
                        id: `firmware-campaign-${campaign.id}`,
                        type: 'firmware',
                        title: 'Firmware Update Completed',
                        message: `Campaign "${campaign.name}" completed successfully. ${campaign.completed} devices updated.`,
                        timestamp: campaign.completedAt,
                        read: false,
                        link: `/firmware?id=${campaign.id}${campaign.siteId ? `&siteId=${campaign.siteId}` : ''}`,
                        siteId: campaign.siteId || undefined,
                    });
                } else if (campaign.status === 'FAILED') {
                    notifications.push({
                        id: `firmware-campaign-${campaign.id}`,
                        type: 'firmware',
                        title: 'Firmware Update Failed',
                        message: `Campaign "${campaign.name}" failed. ${campaign.failed} devices failed to update.`,
                        timestamp: campaign.updatedAt,
                        read: false,
                        link: `/firmware?id=${campaign.id}${campaign.siteId ? `&siteId=${campaign.siteId}` : ''}`,
                        siteId: campaign.siteId || undefined,
                    });
                } else if (campaign.status === 'IN_PROGRESS') {
                    notifications.push({
                        id: `firmware-campaign-${campaign.id}`,
                        type: 'firmware',
                        title: 'Firmware Update In Progress',
                        message: `Campaign "${campaign.name}" is updating ${campaign.inProgress} devices.`,
                        timestamp: campaign.startedAt || campaign.updatedAt,
                        read: false,
                        link: `/firmware?id=${campaign.id}${campaign.siteId ? `&siteId=${campaign.siteId}` : ''}`,
                        siteId: campaign.siteId || undefined,
                    });
                }

                // Individual device failure notifications
                for (const deviceUpdate of campaign.FirmwareDeviceUpdate || []) {
                    notifications.push({
                        id: `firmware-device-${deviceUpdate.id}`,
                        type: 'firmware',
                        title: 'Device Firmware Update Failed',
                        message: `Device ${deviceUpdate.Device.deviceId} failed to update firmware: ${deviceUpdate.errorMessage || 'Unknown error'}`,
                        timestamp: deviceUpdate.completedAt || deviceUpdate.updatedAt,
                        read: false,
                        link: `/firmware?id=${campaign.id}&deviceId=${deviceUpdate.deviceId}${deviceUpdate.Device.siteId ? `&siteId=${deviceUpdate.Device.siteId}` : ''}`,
                        siteId: deviceUpdate.Device.siteId || undefined,
                    });
                }
            }

            // 5. Get devices with firmware update available
            // Skip if firmware columns don't exist in database yet
            const devicesWithUpdates: any[] = [];
            // Note: This will be enabled after migration adds firmware columns
            // For now, return empty array to avoid errors

            for (const device of devicesWithUpdates) {
                notifications.push({
                    id: `firmware-available-${device.id}`,
                    type: 'firmware',
                    title: 'Firmware Update Available',
                    message: `Device ${device.deviceId} has firmware update available (${device.firmwareVersion || 'unknown'} → ${device.firmwareTarget || 'unknown'}).`,
                    timestamp: device.updatedAt,
                    read: false,
                    link: `/lookup?id=${device.id}&siteId=${device.siteId}`,
                    siteId: device.siteId,
                });
            }

            // Sort by timestamp desc
            return notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        }),
});
