/**
 * Calendar Service
 *
 * Generates iCal (.ics) feeds for trainers and clients to sync with external calendar apps
 * like Google Calendar, Apple Calendar, and Outlook.
 */

import 'server-only'

import { db } from '@/lib/db'
import { profiles, sessions, bookings } from '@/lib/db/schema'
import { eq, and, gte, lte, inArray } from 'drizzle-orm'
import { getOrCreateCalendarToken, regenerateCalendarToken } from '@/lib/db/queries/calendar'

// Re-export token helpers so API routes can import from one place
export { getOrCreateCalendarToken, regenerateCalendarToken }

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

/**
 * Generate an iCal UID for a session
 * UIDs must be globally unique and persistent
 */
function generateUID(sessionId: string, domain: string = 'forge-pwa.vercel.app'): string {
  return `session-${sessionId}@${domain}`
}

/**
 * Escape special characters in iCal text fields
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Format a Date object to iCal date-time format (UTC)
 * Format: YYYYMMDDTHHMMSSZ
 */
function formatICalDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

/**
 * Format current timestamp for DTSTAMP
 */
function getCurrentTimestamp(): string {
  return formatICalDate(new Date())
}

/**
 * Get iCal status from session status
 */
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

/**
 * Generate a single VEVENT block for a session
 */
function generateVEvent(session: SessionForCalendar, domain: string = 'forge-pwa.vercel.app'): string {
  const uid = generateUID(session.id, domain)
  const dtstart = formatICalDate(new Date(session.startsAt))
  const dtend = formatICalDate(new Date(session.endsAt))
  const dtstamp = getCurrentTimestamp()
  const created = formatICalDate(new Date(session.createdAt))
  const lastModified = formatICalDate(new Date(session.updatedAt))

  // Build summary with booking count if available
  let summary = escapeICalText(session.title)
  if (session.bookedCount !== undefined && session.capacity) {
    summary += ` (${session.bookedCount}/${session.capacity} booked)`
  }

  // Build description
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
    .filter(s => s.status !== 'cancelled') // Optionally filter cancelled sessions
    .map(s => generateVEvent(s, domain))
    .join('\r\n')

  const footer = 'END:VCALENDAR'

  return `${header}\r\n${events}\r\n${footer}\r\n`
}

// ============================================================================
// DB-backed functions (server-only)
// ============================================================================

/**
 * Fetch sessions for a trainer and generate iCal feed
 */
export async function generateTrainerICalFeed(
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
    daysAhead = 90, // 3 months ahead
    daysBehind = 30, // 1 month behind
  } = options

  // Get trainer info
  const trainer = await db.query.profiles.findFirst({
    where: eq(profiles.id, trainerId),
    columns: { fullName: true },
  })

  const trainerName = trainer?.fullName || 'Trainer'

  // Calculate date range
  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - daysBehind)
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + daysAhead)

  // Build status filter
  const statuses: Array<'scheduled' | 'completed' | 'cancelled'> = ['scheduled']
  if (includeCompleted) statuses.push('completed')
  if (includeCancelled) statuses.push('cancelled')

  // Fetch sessions with session type relation
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

  // Get booking counts in a single batch query
  const sessionIds = rawSessions.map(s => s.id)
  const bookingCountMap = new Map<string, number>()

  if (sessionIds.length > 0) {
    const confirmedBookings = await db
      .select({ sessionId: bookings.sessionId })
      .from(bookings)
      .where(
        and(
          inArray(bookings.sessionId, sessionIds),
          eq(bookings.status, 'confirmed')
        )
      )

    for (const b of confirmedBookings) {
      bookingCountMap.set(b.sessionId, (bookingCountMap.get(b.sessionId) || 0) + 1)
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

/**
 * Validate a calendar token and return the trainer's profile ID
 */
export async function validateCalendarToken(token: string): Promise<string | null> {
  const profile = await db.query.profiles.findFirst({
    where: and(
      eq(profiles.calendarToken, token),
      eq(profiles.isTrainer, true)
    ),
    columns: { id: true },
  })

  return profile?.id ?? null
}
