/**
 * Site Manager Display
 *
 * Shows the site manager as plain text, or as a PersonToken (no hover tooltip on
 * dashboard; click still goes to People page) when they have an existing person profile.
 * Uses a per-site query so it does not touch the global people store.
 */

'use client'

import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { PersonToken } from '@/components/people/PersonToken'
import type { Person } from '@/lib/stores/personStore'
import type { Site } from '@/lib/SiteContext'

interface SiteManagerDisplayProps {
  site: Site
  className?: string
}

type ApiPerson = {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  role?: string | null
  imageUrl?: string | null
  x?: number | null
  y?: number | null
  siteId: string
  createdAt: Date | string
  updatedAt: Date | string
}

function matchManagerToPerson(managerName: string, people: ApiPerson[]): ApiPerson | undefined {
  const trimmed = managerName.trim()
  return people.find((p) => {
    const fullName = `${p.firstName} ${p.lastName}`.trim()
    return fullName === trimmed || p.firstName === trimmed || p.lastName === trimmed
  })
}

function toPerson(p: ApiPerson): Person {
  return {
    ...p,
    createdAt: p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt),
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt : new Date(p.updatedAt),
  }
}

export function SiteManagerDisplay({ site, className = '' }: SiteManagerDisplayProps) {
  const router = useRouter()
  const { data: sitePeople = [] } = trpc.person.list.useQuery(
    { siteId: site.id },
    { enabled: !!site.id && !!site.manager }
  )

  const rawManager = site.manager ? matchManagerToPerson(site.manager, sitePeople) : null
  const managerPerson = rawManager ? toPerson({ ...rawManager, siteId: site.id }) : null

  const handlePersonClick = (personId: string) => {
    router.push(`/people?personId=${personId}`)
  }

  if (!site.manager) return null

  if (managerPerson) {
    return (
      <PersonToken
        person={managerPerson}
        size="sm"
        showName={true}
        onClick={handlePersonClick}
        variant="subtle"
        layout="chip"
        tooltipDetailLevel="none"
        className={className}
      />
    )
  }

  return (
    <div className={`text-sm text-[var(--color-text-muted)] truncate ${className}`}>
      {site.manager}
    </div>
  )
}
