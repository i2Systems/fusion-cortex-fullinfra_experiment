/**
 * Firmware Router
 * 
 * tRPC procedures for firmware update operations:
 * - List firmware update campaigns
 * - Create new firmware update campaign
 * - Get campaign details
 * - Update campaign status (start/stop/pause)
 * - Get devices eligible for update
 * - Get device firmware status
 * - Trigger update for specific device
 * 
 * AI Note: Firmware updates are managed as campaigns that can target
 * specific device types and sites.
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { FirmwareUpdateStatus, FirmwareDeviceStatus, FirmwareStatus, DeviceType } from '@prisma/client'
import { DisplayDeviceTypeSchema, fromDisplayType } from '@/lib/types'

const FirmwareUpdateStatusSchema = z.nativeEnum(FirmwareUpdateStatus)
const FirmwareDeviceStatusSchema = z.nativeEnum(FirmwareDeviceStatus)
const FirmwareStatusSchema = z.nativeEnum(FirmwareStatus)

export const firmwareRouter = router({
  // List firmware update campaigns
  listCampaigns: publicProcedure
    .input(z.object({
      siteId: z.string().optional(),
      includeCompleted: z.boolean().optional().default(false),
    }))
    .query(async ({ input }) => {
      const where: any = {}
      
      if (input.siteId) {
        where.siteId = input.siteId
      }
      
      if (!input.includeCompleted) {
        where.status = {
          not: FirmwareUpdateStatus.COMPLETED,
        }
      }
      
      const campaigns = await prisma.firmwareUpdate.findMany({
        where,
        include: {
          Site: {
            select: {
              id: true,
              name: true,
              storeNumber: true,
            },
          },
          FirmwareDeviceUpdate: {
            select: {
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      
      // Calculate actual counts from device updates
      const campaignsWithCounts = campaigns.map(campaign => {
        const deviceUpdates = campaign.FirmwareDeviceUpdate || []
        const completed = deviceUpdates.filter(du => du.status === FirmwareDeviceStatus.COMPLETED).length
        const failed = deviceUpdates.filter(du => du.status === FirmwareDeviceStatus.FAILED).length
        const inProgress = deviceUpdates.filter(du => du.status === FirmwareDeviceStatus.IN_PROGRESS).length
        const pending = deviceUpdates.filter(du => du.status === FirmwareDeviceStatus.PENDING).length
        
        return {
          ...campaign,
          completed,
          failed,
          inProgress,
          pending,
          totalDevices: deviceUpdates.length,
        }
      })
      
      return campaignsWithCounts
    }),

  // Create new firmware update campaign
  createCampaign: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      version: z.string().min(1),
      fileUrl: z.string().url().optional(),
      siteId: z.string().optional(),
      deviceTypes: z.array(DisplayDeviceTypeSchema),
      scheduledAt: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      // Convert display device types to Prisma types
      const prismaDeviceTypes = input.deviceTypes.map(fromDisplayType) as DeviceType[]
      
      const campaign = await prisma.firmwareUpdate.create({
        data: {
          id: randomUUID(),
          name: input.name,
          description: input.description,
          version: input.version,
          fileUrl: input.fileUrl,
          siteId: input.siteId,
          deviceTypes: prismaDeviceTypes,
          scheduledAt: input.scheduledAt,
          status: FirmwareUpdateStatus.PENDING,
          totalDevices: 0,
          updatedAt: new Date(),
          completed: 0,
          failed: 0,
          inProgress: 0,
        },
        include: {
          Site: {
            select: {
              id: true,
              name: true,
              storeNumber: true,
            },
          },
        },
      })
      
      return campaign
    }),

  // Get campaign details
  getCampaign: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input }) => {
      const campaign = await prisma.firmwareUpdate.findUnique({
        where: { id: input.id },
        include: {
          Site: {
            select: {
              id: true,
              name: true,
              storeNumber: true,
            },
          },
          FirmwareDeviceUpdate: {
            include: {
              Device: {
                select: {
                  id: true,
                  deviceId: true,
                  serialNumber: true,
                  type: true,
                  firmwareVersion: true,
                  firmwareStatus: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      })
      
      if (!campaign) {
        throw new Error('Campaign not found')
      }
      
      return campaign
    }),

  // Update campaign status
  updateCampaignStatus: publicProcedure
    .input(z.object({
      id: z.string(),
      status: FirmwareUpdateStatusSchema,
    }))
    .mutation(async ({ input }) => {
      const updateData: any = {
        status: input.status,
      }
      
      // Auto-set timestamps based on status
      if (input.status === FirmwareUpdateStatus.IN_PROGRESS) {
        updateData.startedAt = new Date()
      } else if (input.status === FirmwareUpdateStatus.COMPLETED) {
        updateData.completedAt = new Date()
      }
      
      const campaign = await prisma.firmwareUpdate.update({
        where: { id: input.id },
        data: updateData,
        include: {
          Site: {
            select: {
              id: true,
              name: true,
              storeNumber: true,
            },
          },
        },
      })
      
      return campaign
    }),

  // Get devices eligible for update
  getEligibleDevices: publicProcedure
    .input(z.object({
      campaignId: z.string(),
    }))
    .query(async ({ input }) => {
      const campaign = await prisma.firmwareUpdate.findUnique({
        where: { id: input.campaignId },
        select: {
          deviceTypes: true,
          siteId: true,
          version: true,
        },
      })
      
      if (!campaign) {
        throw new Error('Campaign not found')
      }
      
      // Find devices that match the campaign criteria
      const where: any = {
        parentId: null, // Only top-level devices
        type: {
          in: campaign.deviceTypes,
        },
      }
      
      if (campaign.siteId) {
        where.siteId = campaign.siteId
      }
      
      // Get devices that either don't have this firmware version or have update available status
      const devices = await prisma.device.findMany({
        where,
        select: {
          id: true,
          deviceId: true,
          serialNumber: true,
          type: true,
          firmwareVersion: true,
          firmwareStatus: true,
          siteId: true,
          status: true,
        },
        orderBy: {
          deviceId: 'asc',
        },
      })
      
      // Filter to only devices that need the update
      const eligibleDevices = devices.filter(device => {
        // If device already has this version, skip
        if (device.firmwareVersion === campaign.version) {
          return false
        }
        // If device is already up to date and not in update required state, skip
        if (device.firmwareStatus === FirmwareStatus.UP_TO_DATE && device.firmwareVersion === campaign.version) {
          return false
        }
        return true
      })
      
      return eligibleDevices
    }),

  // Add devices to campaign
  addDevicesToCampaign: publicProcedure
    .input(z.object({
      campaignId: z.string(),
      deviceIds: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      // Check if campaign exists
      const campaign = await prisma.firmwareUpdate.findUnique({
        where: { id: input.campaignId },
        select: { id: true, version: true },
      })
      
      if (!campaign) {
        throw new Error('Campaign not found')
      }
      
      // Create device update records
      const deviceUpdates = await Promise.all(
        input.deviceIds.map(deviceId =>
          prisma.firmwareDeviceUpdate.upsert({
            where: {
              firmwareUpdateId_deviceId: {
                firmwareUpdateId: input.campaignId,
                deviceId,
              },
            },
            create: {
              id: randomUUID(),
              firmwareUpdateId: input.campaignId,
              deviceId,
              status: FirmwareDeviceStatus.PENDING,
              retryCount: 0,
              updatedAt: new Date(),
            },
            update: {
              status: FirmwareDeviceStatus.PENDING,
              errorMessage: null,
              retryCount: 0,
            },
          })
        )
      )
      
      // Update device firmware status
      await prisma.device.updateMany({
        where: {
          id: { in: input.deviceIds },
        },
        data: {
          firmwareTarget: campaign.version,
          firmwareStatus: FirmwareStatus.UPDATE_AVAILABLE,
        },
      })
      
      // Update campaign total device count
      const totalDevices = await prisma.firmwareDeviceUpdate.count({
        where: { firmwareUpdateId: input.campaignId },
      })
      
      await prisma.firmwareUpdate.update({
        where: { id: input.campaignId },
        data: { totalDevices },
      })
      
      return { success: true, count: deviceUpdates.length }
    }),

  // Get device firmware status
  getDeviceFirmware: publicProcedure
    .input(z.object({
      deviceId: z.string(),
    }))
    .query(async ({ input }) => {
      const device = await prisma.device.findUnique({
        where: { id: input.deviceId },
        select: {
          id: true,
          deviceId: true,
          firmwareVersion: true,
          firmwareTarget: true,
          firmwareStatus: true,
          lastFirmwareUpdate: true,
        },
      })
      
      if (!device) {
        throw new Error('Device not found')
      }
      
      // Get any active firmware updates for this device
      const activeUpdates = await prisma.firmwareDeviceUpdate.findMany({
        where: {
          deviceId: input.deviceId,
          status: {
            in: [FirmwareDeviceStatus.PENDING, FirmwareDeviceStatus.IN_PROGRESS],
          },
        },
        include: {
          FirmwareUpdate: {
            select: {
              id: true,
              name: true,
              version: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      
      return {
        ...device,
        activeUpdates,
      }
    }),

  // Trigger update for specific device
  updateDevice: publicProcedure
    .input(z.object({
      deviceId: z.string(),
      campaignId: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Verify device update record exists
      const deviceUpdate = await prisma.firmwareDeviceUpdate.findUnique({
        where: {
          firmwareUpdateId_deviceId: {
            firmwareUpdateId: input.campaignId,
            deviceId: input.deviceId,
          },
        },
        include: {
          FirmwareUpdate: {
            select: {
              version: true,
            },
          },
        },
      })
      
      if (!deviceUpdate) {
        throw new Error('Device not part of this campaign')
      }
      
      // Update device update status to in progress
      const updated = await prisma.firmwareDeviceUpdate.update({
        where: {
          firmwareUpdateId_deviceId: {
            firmwareUpdateId: input.campaignId,
            deviceId: input.deviceId,
          },
        },
        data: {
          status: FirmwareDeviceStatus.IN_PROGRESS,
          startedAt: new Date(),
          errorMessage: null,
        },
      })
      
      // Update device firmware status
      await prisma.device.update({
        where: { id: input.deviceId },
        data: {
          firmwareStatus: FirmwareStatus.UPDATE_IN_PROGRESS,
        },
      })
      
      // Update campaign counts
      const campaign = await prisma.firmwareUpdate.findUnique({
        where: { id: input.campaignId },
        include: {
          FirmwareDeviceUpdate: {
            select: { status: true },
          },
        },
      })
      
      if (campaign) {
        const inProgress = campaign.FirmwareDeviceUpdate.filter(
          (du: any) => du.status === FirmwareDeviceStatus.IN_PROGRESS
        ).length
        
        await prisma.firmwareUpdate.update({
          where: { id: input.campaignId },
          data: { inProgress },
        })
      }
      
      return updated
    }),

  // Complete device update (called after successful update)
  completeDeviceUpdate: publicProcedure
    .input(z.object({
      deviceId: z.string(),
      campaignId: z.string(),
      success: z.boolean(),
      errorMessage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const deviceUpdate = await prisma.firmwareDeviceUpdate.findUnique({
        where: {
          firmwareUpdateId_deviceId: {
            firmwareUpdateId: input.campaignId,
            deviceId: input.deviceId,
          },
        },
        include: {
          FirmwareUpdate: {
            select: {
              version: true,
            },
          },
        },
      })
      
      if (!deviceUpdate) {
        throw new Error('Device update not found')
      }
      
      const status = input.success
        ? FirmwareDeviceStatus.COMPLETED
        : FirmwareDeviceStatus.FAILED
      
      // Update device update record
      await prisma.firmwareDeviceUpdate.update({
        where: {
          firmwareUpdateId_deviceId: {
            firmwareUpdateId: input.campaignId,
            deviceId: input.deviceId,
          },
        },
        data: {
          status,
          completedAt: new Date(),
          errorMessage: input.errorMessage || null,
        },
      })
      
      // Update device firmware info
      await prisma.device.update({
        where: { id: input.deviceId },
        data: {
          firmwareVersion: input.success ? deviceUpdate.FirmwareUpdate.version : undefined,
          firmwareStatus: input.success ? FirmwareStatus.UP_TO_DATE : FirmwareStatus.UPDATE_FAILED,
          firmwareTarget: input.success ? null : deviceUpdate.FirmwareUpdate.version,
          lastFirmwareUpdate: input.success ? new Date() : undefined,
        },
      })
      
      // Update campaign counts
      const campaign = await prisma.firmwareUpdate.findUnique({
        where: { id: input.campaignId },
        include: {
          FirmwareDeviceUpdate: {
            select: { status: true },
          },
        },
      })
      
      if (campaign) {
        const completed = campaign.FirmwareDeviceUpdate.filter(
          du => du.status === FirmwareDeviceStatus.COMPLETED
        ).length
        const failed = campaign.FirmwareDeviceUpdate.filter(
          du => du.status === FirmwareDeviceStatus.FAILED
        ).length
        const inProgress = campaign.FirmwareDeviceUpdate.filter(
          (du: any) => du.status === FirmwareDeviceStatus.IN_PROGRESS
        ).length
        
        // Check if campaign is complete
        const total = campaign.FirmwareDeviceUpdate.length
        const finished = completed + failed
        const newStatus = finished === total
          ? FirmwareUpdateStatus.COMPLETED
          : campaign.status === FirmwareUpdateStatus.PENDING && inProgress > 0
          ? FirmwareUpdateStatus.IN_PROGRESS
          : campaign.status
        
        await prisma.firmwareUpdate.update({
          where: { id: input.campaignId },
          data: {
            completed,
            failed,
            inProgress,
            status: newStatus,
            completedAt: newStatus === FirmwareUpdateStatus.COMPLETED ? new Date() : undefined,
          },
        })
      }
      
      return { success: true }
    }),

  // Delete campaign
  deleteCampaign: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input }) => {
      await prisma.firmwareUpdate.delete({
        where: { id: input.id },
      })
      
      return { success: true }
    }),
})
