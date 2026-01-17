/**
 * Date utility functions for consistent timezone handling
 *
 * These utilities ensure dates are properly converted between UTC (stored in DB)
 * and local time (displayed in UI and HTML inputs).
 */

/**
 * Convert a UTC ISO string to local date and time strings for HTML inputs
 *
 * @param isoString - UTC ISO date string from database (e.g., "2024-01-16T02:00:00Z")
 * @returns Object with date (YYYY-MM-DD) and time (HH:MM) in local timezone
 *
 * @example
 * // If local timezone is EST (UTC-5)
 * utcToLocalInputs("2024-01-16T14:00:00Z")
 * // Returns: { date: "2024-01-16", time: "09:00" }
 */
export function utcToLocalInputs(isoString: string): { date: string; time: string } {
  const date = new Date(isoString)

  // Get local year, month, day
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  // Get local hours and minutes
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  }
}

/**
 * Convert local HTML input date and time values to a UTC ISO string
 *
 * @param date - Local date string (YYYY-MM-DD) from date input
 * @param time - Local time string (HH:MM) from time input
 * @returns UTC ISO string for database storage
 *
 * @example
 * // If local timezone is EST (UTC-5)
 * localInputsToUtc("2024-01-16", "09:00")
 * // Returns: "2024-01-16T14:00:00.000Z"
 */
export function localInputsToUtc(date: string, time: string): string {
  // Create date object from local date/time
  // Using this format ensures JavaScript interprets it as local time
  const localDateTime = new Date(`${date}T${time}:00`)
  return localDateTime.toISOString()
}

/**
 * Get the current local date as a string for HTML date inputs
 *
 * @returns Local date string (YYYY-MM-DD)
 */
export function getLocalDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get the current local time as a string for HTML time inputs
 *
 * @returns Local time string (HH:MM)
 */
export function getLocalTimeString(): string {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}
