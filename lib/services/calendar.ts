/**
 * Calendar Service
 *
 * Generates iCal (.ics) feeds for trainers and clients to sync with external calendar apps
 * like Google Calendar, Apple Calendar, and Outlook.
 */

import { createClient } from '@/lib/supabase-browser'
import type { Session, SessionType } from '@/lib/types/sessions'

interface SessionForCalendar extends Session {
  session_type?: SessionType | null
  booked_count?: number
}

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
  const dtstart = formatICalDate(new Date(session.starts_at))
  const dtend = formatICalDate(new Date(session.ends_at))
  const dtstamp = getCurrentTimestamp()
  const created = formatICalDate(new Date(session.created_at))
  const lastModified = formatICalDate(new Date(session.updated_at))

  // Build summary with booking count if available
  let summary = escapeICalText(session.title)
  if (session.booked_count !== undefined && session.capacity) {
    summary += ` (${session.booked_count}/${session.capacity} booked)`
  }

  // Build description
  let description = ''
  if (session.description) {
    description = escapeICalText(session.description)
  }
  if (session.session_type) {
    description += description ? '\\n\\n' : ''
    description += `Type: ${escapeICalText(session.session_type.name)}`
  }
  if (session.capacity) {
    description += description ? '\\n' : ''
    description += `Capacity: ${session.booked_count || 0} of ${session.capacity} spots booked`
  }
  if (session.is_premium) {
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
  sessions: SessionForCalendar[],
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

  const events = sessions
    .filter(s => s.status !== 'cancelled') // Optionally filter cancelled sessions
    .map(s => generateVEvent(s, domain))
    .join('\r\n')

  const footer = 'END:VCALENDAR'

  return `${header}\r\n${events}\r\n${footer}\r\n`
}

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
  const supabase = createClient()

  const {
    includeCompleted = true,
    includeCancelled = false,
    daysAhead = 90, // 3 months ahead
    daysBehind = 30, // 1 month behind
  } = options

  // Get trainer info
  const { data: trainer } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', trainerId)
    .single()

  const trainerName = trainer?.full_name || 'Trainer'

  // Calculate date range
  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - daysBehind)
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + daysAhead)

  // Build status filter
  const statuses = ['scheduled']
  if (includeCompleted) statuses.push('completed')
  if (includeCancelled) statuses.push('cancelled')

  // Fetch sessions
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(`
      *,
      session_type:session_types(*)
    `)
    .eq('trainer_id', trainerId)
    .in('status', statuses)
    .gte('starts_at', startDate.toISOString())
    .lte('starts_at', endDate.toISOString())
    .order('starts_at', { ascending: true })

  if (error) {
    throw new Error('Failed to fetch sessions for calendar')
  }

  // Get booking counts for each session
  const sessionsWithBookings = await Promise.all(
    (sessions || []).map(async (session) => {
      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session.id)
        .eq('status', 'confirmed')

      // Handle FK join format
      const session_type = Array.isArray(session.session_type)
        ? session.session_type[0] || null
        : session.session_type

      return {
        ...session,
        session_type,
        booked_count: count || 0,
      } as SessionForCalendar
    })
  )

  const ical = generateICalFeed(sessionsWithBookings)

  return { ical, trainerName }
}

/**
 * Get or create a calendar token for the current user
 */
export async function getOrCreateCalendarToken(): Promise<string> {
  const supabase = createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase.rpc('get_or_create_calendar_token', {
    p_user_id: userData.user.id,
  })

  if (error) {
    throw new Error('Failed to get calendar token')
  }

  return data
}

/**
 * Regenerate the calendar token for the current user
 */
export async function regenerateCalendarToken(): Promise<string> {
  const supabase = createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase.rpc('regenerate_calendar_token', {
    p_user_id: userData.user.id,
  })

  if (error) {
    throw new Error('Failed to regenerate calendar token')
  }

  return data
}

/**
 * Validate a calendar token and return the trainer ID
 */
export async function validateCalendarToken(token: string): Promise<string | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('calendar_token', token)
    .eq('is_trainer', true)
    .single()

  if (error || !data) {
    return null
  }

  return data.id
}
