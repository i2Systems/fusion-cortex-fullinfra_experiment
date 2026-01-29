import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { logger } from '@/lib/logger'
import { SITE_ROLE_TYPES } from '@/lib/constants/roleTypes'

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

/**
 * Get or create a role-based group for a given role (within a transaction).
 */
async function ensureRoleGroupWithTx(tx: PrismaTx, siteId: string, role: string): Promise<string | null> {
    if (!role || role.trim() === '') return null

    const existingGroup = await tx.group.findFirst({
        where: { siteId, name: role },
        include: { GroupPerson: true }
    })
    if (existingGroup) return existingGroup.id

    const isStandardRole = SITE_ROLE_TYPES.some(r => r.value === role)
    const roleGroup = await tx.group.create({
        data: {
            id: randomUUID(),
            name: role,
            description: `Auto-generated group for ${role} role`,
            color: isStandardRole ? '#4c7dff' : '#8b5cf6',
            siteId,
            updatedAt: new Date()
        }
    })
    logger.info(`Created role group "${role}" for site ${siteId}`)
    return roleGroup.id
}

/**
 * Sync a person to their role group (within a transaction).
 */
async function syncPersonToRoleGroupWithTx(
    tx: PrismaTx,
    personId: string,
    siteId: string,
    newRole: string | null | undefined,
    oldRole?: string | null
): Promise<void> {
    if (oldRole && oldRole !== newRole) {
        const oldRoleGroup = await tx.group.findFirst({
            where: { siteId, name: oldRole },
            include: { GroupPerson: true }
        })
        if (oldRoleGroup) {
            await tx.groupPerson.deleteMany({
                where: { groupId: oldRoleGroup.id, personId }
            })
        }
    }

    if (newRole && newRole.trim() !== '') {
        const roleGroupId = await ensureRoleGroupWithTx(tx, siteId, newRole)
        if (roleGroupId) {
            const existing = await tx.groupPerson.findFirst({
                where: { groupId: roleGroupId, personId }
            })
            if (!existing) {
                await tx.groupPerson.create({
                    data: {
                        id: randomUUID(),
                        groupId: roleGroupId,
                        personId
                    }
                })
            }
        }
    }
}

/**
 * Sync a person to their role group (standalone; used by syncAllToRoleGroups).
 */
async function syncPersonToRoleGroup(personId: string, siteId: string, newRole: string | null | undefined, oldRole?: string | null) {
    try {
        await prisma.$transaction((tx) => syncPersonToRoleGroupWithTx(tx, personId, siteId, newRole, oldRole))
    } catch (error) {
        logger.error(`Error syncing person ${personId} to role group:`, error)
    }
}

// Allow empty string or valid email (z.string().email() rejects '')
const emailSchema = z.union([z.string().email(), z.literal('')]).optional()

// Normalized map coordinates 0–1
const coordSchema = z.number().min(0).max(1).optional()

// Input schemas
const createPersonSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: emailSchema,
    role: z.string().optional(),
    imageUrl: z.string().optional(),
    x: coordSchema,
    y: coordSchema,
    siteId: z.string(),
})

const updatePersonSchema = z.object({
    id: z.string(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: emailSchema,
    role: z.string().optional(),
    imageUrl: z.string().optional(),
    x: coordSchema,
    y: coordSchema,
})

export const personRouter = router({
    get: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
            return await prisma.person.findUnique({
                where: { id: input.id }
            })
        }),

    list: publicProcedure
        .input(z.object({ siteId: z.string() }))
        .query(async ({ input }) => {
            const people = await prisma.person.findMany({
                where: { siteId: input.siteId },
                orderBy: { createdAt: 'desc' },
                include: { GroupPerson: true }
            })
            return people.map(({ GroupPerson, ...p }) => ({
                ...p,
                groupIds: GroupPerson.map((gp) => gp.groupId)
            }))
        }),

    create: publicProcedure
        .input(createPersonSchema)
        .mutation(async ({ input }) => {
            return await prisma.$transaction(async (tx) => {
                const person = await tx.person.create({
                    data: {
                        id: randomUUID(),
                        ...input,
                        updatedAt: new Date()
                    }
                })
                if (input.role) {
                    await syncPersonToRoleGroupWithTx(tx, person.id, input.siteId, input.role)
                }
                return person
            })
        }),

    update: publicProcedure
        .input(updatePersonSchema)
        .mutation(async ({ input }) => {
            const { id, ...data } = input
            return await prisma.$transaction(async (tx) => {
                const existingPerson = await tx.person.findUnique({
                    where: { id },
                    select: { role: true, siteId: true }
                })
                const person = await tx.person.update({
                    where: { id },
                    data: {
                        ...data,
                        updatedAt: new Date()
                    }
                })
                if (data.role !== undefined && existingPerson) {
                    await syncPersonToRoleGroupWithTx(
                        tx,
                        id,
                        existingPerson.siteId,
                        data.role,
                        existingPerson.role
                    )
                }
                return person
            })
        }),

    delete: publicProcedure
        .input(z.string())
        .mutation(async ({ input }) => {
            return await prisma.person.delete({
                where: { id: input }
            })
        }),

    // Save person image to database (stored in imageUrl field)
    saveImage: publicProcedure
        .input(z.object({
            personId: z.string(),
            imageData: z.string(), // Base64 encoded image
            mimeType: z.string().optional().default('image/jpeg'),
        }))
        .mutation(async ({ input }) => {
            const MAX_RETRIES = 3
            let lastError: any = null

            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                try {
                    // Verify person exists
                    const personExists = await prisma.person.findUnique({
                        where: { id: input.personId },
                        select: { id: true },
                    })

                    if (!personExists) {
                        throw new Error(`Person with ID ${input.personId} not found`)
                    }

                    // Store imageUrl directly in database (base64 or URL)
                    // For now, we'll store as base64. If Supabase is configured, could upload there first.
                    let imageUrl = input.imageData // Default to base64

                    // Update person with imageUrl
                    const person = await prisma.person.update({
                        where: { id: input.personId },
                        data: { imageUrl },
                    })

                    logger.info(`Person image saved for ${input.personId}`)
                    return person
                } catch (error: any) {
                    lastError = error
                    logger.error(`Error saving person image to database (attempt ${attempt + 1}):`, error)

                    // Handle missing column error
                    if (error.code === 'P2022' && error.meta?.column === 'Person.imageUrl') {
                        logger.warn('imageUrl column missing, attempting to add it...')
                        try {
                            await prisma.$executeRaw`ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`
                            // Retry the update
                            const person = await prisma.person.update({
                                where: { id: input.personId },
                                data: { imageUrl: input.imageData },
                            })
                            logger.info(`Person image saved for ${input.personId} (after adding column)`)
                            return person
                        } catch (addColumnError: any) {
                            logger.error('Failed to add imageUrl column:', addColumnError)
                            if (attempt < MAX_RETRIES - 1) continue
                            throw new Error('Database schema update required. Please run migrations: npx prisma db push')
                        }
                    }

                    // Handle person not found
                    if (error.code === 'P2025') {
                        throw new Error(`Person with ID ${input.personId} not found`)
                    }

                    // Handle prepared statement errors
                    if (error.code === '26000' || error.code === '42P05' || error.message?.includes('prepared statement')) {
                        if (attempt < MAX_RETRIES - 1) continue
                    }

                    // If not a retryable error, throw immediately
                    if (attempt < MAX_RETRIES - 1) continue
                }
            }

            throw new Error(`Failed to save person image after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`)
        }),

    // Sync all people to their role groups (useful for migrating existing data)
    syncAllToRoleGroups: publicProcedure
        .input(z.object({ siteId: z.string() }))
        .mutation(async ({ input }) => {
            const people = await prisma.person.findMany({
                where: { siteId: input.siteId },
                select: { id: true, role: true }
            })

            const results = []
            for (const person of people) {
                if (person.role) {
                    try {
                        await syncPersonToRoleGroup(person.id, input.siteId, person.role)
                        results.push({ personId: person.id, success: true })
                    } catch (error) {
                        logger.error(`Failed to sync person ${person.id} to role group:`, error)
                        results.push({ personId: person.id, success: false, error: String(error) })
                    }
                }
            }

            return {
                synced: results.filter(r => r.success).length,
                total: people.length,
                results
            }
        }),
})
