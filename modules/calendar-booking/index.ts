// Services
export { bookSession } from './services/bookings'
export { getSessionAvailability, getSessionsAvailabilityBatch } from './services/availability'
export type { SessionAvailability } from './services/availability'
export {
  generateICalFeed,
  generateTrainerICalFeed,
  getOrCreateCalendarToken,
  regenerateCalendarToken,
  validateCalendarToken,
} from './services/calendar'

// Config
export type { CalendarBookingConfig, CalendarBookingAuthContext, DrizzleInstance } from './config'

// Types
export type {
  Session,
  Booking,
  SessionType,
  SessionWithDetails,
  BookingWithSession,
  CreateSessionInput,
  UpdateSessionInput,
  CancelBookingInput,
  BookSessionResult,
  SessionFilters,
  BookingFilters,
  SessionStatus,
  BookingStatus,
} from './types'
