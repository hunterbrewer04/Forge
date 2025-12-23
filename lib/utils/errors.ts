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
