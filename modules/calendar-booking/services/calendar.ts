/**
 * Calendar service
 *
 * Token CRUD, iCal generation, and feed generation.
 * Merged from lib/db/queries/calendar.ts and lib/services/calendar.ts.
 */

import 'server-only'

import { profiles, sessions, bookings } from '@/lib/db/schema'
import { eq, and, gte, lte, inArray, count } from 'drizzle-orm'
import type { DrizzleInstance } from '../config'

// ============================================================================
// Token CRUD
// ============================================================================

export async function getOrCreateCalendarToken(db: DrizzleInstance, userId: string): Promise<string> {
  return await db.transaction(async (tx) => {
    const profile = await tx.query.profiles.findFirst({
      where: eq(profiles.id, userId),
      columns: { calendarToken: true },
    })

    if (!profile) throw new Error('Profile not found')

    if (profile.calendarToken) return profile.calendarToken

    const newToken = crypto.randomUUID()
    await tx.update(profiles).set({ calendarToken: newToken }).where(eq(profiles.id, userId))
    return newToken
  })
}

export async function regenerateCalendarToken(db: DrizzleInstance, userId: string): Promise<string> {
  const newToken = crypto.randomUUID()
  const [updated] = await db
    .update(profiles)
    .set({ calendarToken: newToken })
    .where(eq(profiles.id, userId))
    .returning({ calendarToken: profiles.calendarToken })

  if (!updated) throw new Error('Profile not found')
  return updated.calendarToken!
}

// ============================================================================
// Internal types
// ============================================================================

interface SessionForCalendar {
  id: string
  title: string
  description: string | null
  location: string | null
  startsAt: Date
  endsAt: Date
  status: string
  isPremium: boolean
  capacity: number | null
  createdAt: Date
  updatedAt: Date
  sessionType?: { name: string } | null
  bookedCount?: number
}

// ============================================================================
// Pure iCal helpers (no DB access)
// ============================================================================

function generateUID(sessionId: string, domain: string = 'forge-pwa.vercel.app'): string {
  return `session-${sessionId}@${domain}`
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function formatICalDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

function getCurrentTimestamp(): string {
  return formatICalDate(new Date())
}

function getICalStatus(status: string): string {
  switch (status) {
    case 'cancelled':
      return 'CANCELLED'
    case 'completed':
      return 'CONFIRMED'
    default:
      return 'CONFIRMED'
  }
}

function generateVEvent(session: SessionForCalendar, domain: string = 'forge-pwa.vercel.app'): string {
  const uid = generateUID(session.id, domain)
  const dtstart = formatICalDate(new Date(session.startsAt))
  const dtend = formatICalDate(new Date(session.endsAt))
  const dtstamp = getCurrentTimestamp()
  const created = formatICalDate(new Date(session.createdAt))
  const lastModified = formatICalDate(new Date(session.updatedAt))

  let summary = escapeICalText(session.title)
  if (session.bookedCount !== undefined && session.capacity) {
    summary += ` (${session.bookedCount}/${session.capacity} booked)`
  }

  let description = ''
  if (session.description) {
    description = escapeICalText(session.description)
  }
  if (session.sessionType) {
    description += description ? '\\n\\n' : ''
    description += `Type: ${escapeICalText(session.sessionType.name)}`
  }
  if (session.capacity) {
    description += description ? '\\n' : ''
    description += `Capacity: ${session.bookedCount || 0} of ${session.capacity} spots booked`
  }
  if (session.isPremium) {
    description += description ? '\\n' : ''
    description += 'Premium Session'
  }

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `CREATED:${created}`,
    `LAST-MODIFIED:${lastModified}`,
    `SUMMARY:${summary}`,
    `STATUS:${getICalStatus(session.status)}`,
  ]

  if (description) {
    lines.push(`DESCRIPTION:${description}`)
  }

  if (session.location) {
    lines.push(`LOCATION:${escapeICalText(session.location)}`)
  }

  lines.push('END:VEVENT')

  return lines.join('\r\n')
}

/**
 * Generate a complete iCal feed from a list of sessions
 */
export function generateICalFeed(
  sessionList: SessionForCalendar[],
  domain: string = 'forge-pwa.vercel.app'
): string {
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Forge Sports Performance//Sessions//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Forge',
    'X-WR-TIMEZONE:UTC',
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'X-PUBLISHED-TTL:PT15M',
  ].join('\r\n')

  const events = sessionList
    .filter(s => s.status !== 'cancelled')
    .map(s => generateVEvent(s, domain))
    .join('\r\n')

  const footer = 'END:VCALENDAR'

  return `${header}\r\n${events}\r\n${footer}\r\n`
}

// ============================================================================
// DB-backed functions (server-only)
// ============================================================================

export async function generateTrainerICalFeed(
  db: DrizzleInstance,
  trainerId: string,
  options: {
    includeCompleted?: boolean
    includeCancelled?: boolean
    daysAhead?: number
    daysBehind?: number
  } = {}
): Promise<{ ical: string; trainerName: string }> {
  const {
    includeCompleted = true,
    includeCancelled = false,
    daysAhead = 90,
    daysBehind = 30,
  } = options

  const trainer = await db.query.profiles.findFirst({
    where: eq(profiles.id, trainerId),
    columns: { fullName: true },
  })

  const trainerName = trainer?.fullName || 'Trainer'

  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - daysBehind)
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + daysAhead)

  const statuses: Array<'scheduled' | 'completed' | 'cancelled'> = ['scheduled']
  if (includeCompleted) statuses.push('completed')
  if (includeCancelled) statuses.push('cancelled')

  const rawSessions = await db.query.sessions.findMany({
    where: and(
      eq(sessions.trainerId, trainerId),
      inArray(sessions.status, statuses),
      gte(sessions.startsAt, startDate),
      lte(sessions.startsAt, endDate)
    ),
    with: {
      sessionType: true,
    },
    orderBy: (s, { asc }) => [asc(s.startsAt)],
  })

  const sessionIds = rawSessions.map(s => s.id)
  const bookingCountMap = new Map<string, number>()

  if (sessionIds.length > 0) {
    const counts = await db
      .select({ sessionId: bookings.sessionId, value: count() })
      .from(bookings)
      .where(
        and(
          inArray(bookings.sessionId, sessionIds),
          eq(bookings.status, 'confirmed')
        )
      )
      .groupBy(bookings.sessionId)

    for (const c of counts) {
      bookingCountMap.set(c.sessionId, c.value)
    }
  }

  const sessionsForFeed: SessionForCalendar[] = rawSessions.map(session => ({
    id: session.id,
    title: session.title,
    description: session.description,
    location: session.location,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    status: session.status,
    isPremium: session.isPremium,
    capacity: session.capacity,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    sessionType: session.sessionType ?? null,
    bookedCount: bookingCountMap.get(session.id) || 0,
  }))

  const ical = generateICalFeed(sessionsForFeed)

  return { ical, trainerName }
}

export async function validateCalendarToken(db: DrizzleInstance, token: string): Promise<string | null> {
  const profile = await db.query.profiles.findFirst({
    where: and(
      eq(profiles.calendarToken, token),
      eq(profiles.isTrainer, true)
    ),
    columns: { id: true },
  })

  return profile?.id ?? null
}
