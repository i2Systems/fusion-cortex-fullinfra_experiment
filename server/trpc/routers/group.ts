import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

// Input schemas
const createGroupSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    color: z.string().optional(),
    siteId: z.string(),
    deviceIds: z.array(z.string()).optional(),
    personIds: z.array(z.string()).optional(),
})

const updateGroupSchema = z.object({
    id: z.string(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    color: z.string().optional(),
    deviceIds: z.array(z.string()).optional(),
    personIds: z.array(z.string()).optional(),
})

export const groupRouter = router({
    get: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
            const group = await prisma.group.findUnique({
                where: { id: input.id },
                include: {
                    GroupDevice: {
                        include: {
                            Device: true
                        }
                    },
                    GroupPerson: {
                        include: {
                            Person: true
                        }
                    }
                }
            })
            if (!group) return null

            return {
                ...group,
                deviceIds: group.GroupDevice.map(gd => gd.deviceId),
                personIds: group.GroupPerson.map(gp => gp.personId)
            }
        }),

    list: publicProcedure
        .input(z.object({ siteId: z.string() }))
        .query(async ({ input }) => {
            const groups = await prisma.group.findMany({
                where: { siteId: input.siteId },
                orderBy: { createdAt: 'desc' },
                include: {
                    GroupDevice: true,
                    GroupPerson: true
                }
            })

            return groups.map(group => ({
                ...group,
                deviceIds: group.GroupDevice.map(gd => gd.deviceId),
                personIds: group.GroupPerson.map(gp => gp.personId)
            }))
        }),

    create: publicProcedure
        .input(createGroupSchema)
        .mutation(async ({ input }) => {
            const { deviceIds, personIds, siteId, ...data } = input

            // Validate devices exist and belong to site
            if (deviceIds && deviceIds.length > 0) {
                const devices = await prisma.device.findMany({
                    where: { id: { in: deviceIds }, siteId }
                })
                if (devices.length !== deviceIds.length) {
                    const foundIds = new Set(devices.map(d => d.id))
                    const missing = deviceIds.filter(id => !foundIds.has(id))
                    throw new Error(`Device(s) not found or wrong site: ${missing.join(', ')}`)
                }
            }

            // Validate people exist and belong to site
            if (personIds && personIds.length > 0) {
                const people = await prisma.person.findMany({
                    where: { id: { in: personIds }, siteId }
                })
                if (people.length !== personIds.length) {
                    const foundIds = new Set(people.map(p => p.id))
                    const missing = personIds.filter(id => !foundIds.has(id))
                    throw new Error(`Person(s) not found or wrong site: ${missing.join(', ')}`)
                }
            }

            const group = await prisma.group.create({
                data: {
                    id: randomUUID(),
                    ...data,
                    siteId,
                    updatedAt: new Date(),
                    GroupDevice: deviceIds && deviceIds.length > 0 ? {
                        create: deviceIds.map(deviceId => ({
                            id: randomUUID(),
                            deviceId
                        }))
                    } : undefined,
                    GroupPerson: personIds && personIds.length > 0 ? {
                        create: personIds.map(personId => ({
                            id: randomUUID(),
                            personId
                        }))
                    } : undefined
                },
                include: {
                    GroupDevice: true,
                    GroupPerson: true
                }
            })

            return {
                ...group,
                deviceIds: group.GroupDevice.map(gd => gd.deviceId),
                personIds: group.GroupPerson.map(gp => gp.personId)
            }
        }),

    update: publicProcedure
        .input(updateGroupSchema)
        .mutation(async ({ input }) => {
            const { id, deviceIds, personIds, ...data } = input

            // If deviceIds are provided, we need to handle relation updates
            if (deviceIds !== undefined) {
                // Delete existing relations not in new list
                await prisma.groupDevice.deleteMany({
                    where: {
                        groupId: id,
                        deviceId: { notIn: deviceIds }
                    }
                })

                // Create new relations
                const existing = await prisma.groupDevice.findMany({
                    where: { groupId: id }
                })
                const existingIds = existing.map(e => e.deviceId)
                const toAdd = deviceIds.filter(did => !existingIds.includes(did))

                if (toAdd.length > 0) {
                    await prisma.groupDevice.createMany({
                        data: toAdd.map(deviceId => ({
                            id: randomUUID(),
                            groupId: id,
                            deviceId
                        }))
                    })
                }
            }

            // If personIds are provided, we need to handle relation updates
            if (personIds !== undefined) {
                // Delete existing relations not in new list
                await prisma.groupPerson.deleteMany({
                    where: {
                        groupId: id,
                        personId: { notIn: personIds }
                    }
                })

                // Create new relations
                const existing = await prisma.groupPerson.findMany({
                    where: { groupId: id }
                })
                const existingIds = existing.map(e => e.personId)
                const toAdd = personIds.filter(pid => !existingIds.includes(pid))

                if (toAdd.length > 0) {
                    await prisma.groupPerson.createMany({
                        data: toAdd.map(personId => ({
                            id: randomUUID(),
                            groupId: id,
                            personId
                        }))
                    })
                }
            }

            const group = await prisma.group.update({
                where: { id },
                data: {
                    ...data,
                    updatedAt: new Date()
                },
                include: {
                    GroupDevice: true,
                    GroupPerson: true
                }
            })

            return {
                ...group,
                deviceIds: group.GroupDevice.map(gd => gd.deviceId),
                personIds: group.GroupPerson.map(gp => gp.personId)
            }
        }),

    addDevice: publicProcedure
        .input(z.object({ groupId: z.string(), deviceId: z.string() }))
        .mutation(async ({ input }) => {
            const group = await prisma.group.findUnique({
                where: { id: input.groupId },
                select: { id: true, siteId: true }
            })
            if (!group) throw new Error('Group not found')
            const device = await prisma.device.findFirst({
                where: { id: input.deviceId, siteId: group.siteId }
            })
            if (!device) throw new Error('Device not found or does not belong to this site')
            const existing = await prisma.groupDevice.findFirst({
                where: { groupId: input.groupId, deviceId: input.deviceId }
            })
            if (existing) {
                const full = await prisma.group.findUnique({
                    where: { id: input.groupId },
                    include: { GroupDevice: true, GroupPerson: true }
                })
                if (!full) return null
                return {
                    ...full,
                    deviceIds: full.GroupDevice.map(gd => gd.deviceId),
                    personIds: full.GroupPerson.map(gp => gp.personId)
                }
            }
            await prisma.groupDevice.create({
                data: {
                    id: randomUUID(),
                    groupId: input.groupId,
                    deviceId: input.deviceId
                }
            })
            const updated = await prisma.group.findUnique({
                where: { id: input.groupId },
                include: { GroupDevice: true, GroupPerson: true }
            })
            if (!updated) return null
            return {
                ...updated,
                deviceIds: updated.GroupDevice.map(gd => gd.deviceId),
                personIds: updated.GroupPerson.map(gp => gp.personId)
            }
        }),

    removeDevice: publicProcedure
        .input(z.object({ groupId: z.string(), deviceId: z.string() }))
        .mutation(async ({ input }) => {
            await prisma.groupDevice.deleteMany({
                where: {
                    groupId: input.groupId,
                    deviceId: input.deviceId
                }
            })
            const group = await prisma.group.findUnique({
                where: { id: input.groupId },
                include: { GroupDevice: true, GroupPerson: true }
            })
            if (!group) return null
            return {
                ...group,
                deviceIds: group.GroupDevice.map(gd => gd.deviceId),
                personIds: group.GroupPerson.map(gp => gp.personId)
            }
        }),

    addPerson: publicProcedure
        .input(z.object({ groupId: z.string(), personId: z.string() }))
        .mutation(async ({ input }) => {
            const group = await prisma.group.findUnique({
                where: { id: input.groupId },
                select: { id: true, siteId: true }
            })
            if (!group) throw new Error('Group not found')
            const person = await prisma.person.findFirst({
                where: { id: input.personId, siteId: group.siteId }
            })
            if (!person) throw new Error('Person not found or does not belong to this site')
            const existing = await prisma.groupPerson.findFirst({
                where: { groupId: input.groupId, personId: input.personId }
            })
            if (existing) {
                const full = await prisma.group.findUnique({
                    where: { id: input.groupId },
                    include: { GroupDevice: true, GroupPerson: true }
                })
                if (!full) return null
                return {
                    ...full,
                    deviceIds: full.GroupDevice.map(gd => gd.deviceId),
                    personIds: full.GroupPerson.map(gp => gp.personId)
                }
            }
            await prisma.groupPerson.create({
                data: {
                    id: randomUUID(),
                    groupId: input.groupId,
                    personId: input.personId
                }
            })
            const updated = await prisma.group.findUnique({
                where: { id: input.groupId },
                include: { GroupDevice: true, GroupPerson: true }
            })
            if (!updated) return null
            return {
                ...updated,
                deviceIds: updated.GroupDevice.map(gd => gd.deviceId),
                personIds: updated.GroupPerson.map(gp => gp.personId)
            }
        }),

    removePerson: publicProcedure
        .input(z.object({ groupId: z.string(), personId: z.string() }))
        .mutation(async ({ input }) => {
            await prisma.groupPerson.deleteMany({
                where: {
                    groupId: input.groupId,
                    personId: input.personId
                }
            })
            const group = await prisma.group.findUnique({
                where: { id: input.groupId },
                include: { GroupDevice: true, GroupPerson: true }
            })
            if (!group) return null
            return {
                ...group,
                deviceIds: group.GroupDevice.map(gd => gd.deviceId),
                personIds: group.GroupPerson.map(gp => gp.personId)
            }
        }),

    delete: publicProcedure
        .input(z.string())
        .mutation(async ({ input }) => {
            const deleted = await prisma.group.delete({
                where: { id: input }
            })
            // Return flattened shape consistent with create/update (deviceIds/personIds removed by cascade)
            return {
                id: deleted.id,
                name: deleted.name,
                description: deleted.description ?? undefined,
                color: deleted.color,
                siteId: deleted.siteId,
                deviceIds: [] as string[],
                personIds: [] as string[],
                createdAt: deleted.createdAt,
                updatedAt: deleted.updatedAt
            }
        }),
})
