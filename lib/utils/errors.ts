export interface AppError {
  message: string
  code?: string
}

/**
 * Safely extracts an error message from an unknown error value.
 * Use this in catch blocks instead of `catch (err: any)`.
 *
 * @example
 * try {
 *   await someOperation()
 * } catch (err: unknown) {
 *   setError(getErrorMessage(err))
 * }
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'An unexpected error occurred'
}

/**
 * Extracts a human-readable error message from a Clerk API error.
 * Clerk errors have shape { errors: [{ message: string }] }.
 */
export function getClerkErrorMessage(err: unknown, fallback: string): string {
  if (
    err &&
    typeof err === 'object' &&
    'errors' in err &&
    Array.isArray((err as { errors: unknown[] }).errors)
  ) {
    const firstError = (err as { errors: { message?: string }[] }).errors[0]
    if (firstError?.message) return firstError.message
  }
  return fallback
}
