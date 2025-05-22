import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractErrorReason(e: unknown) {
  const defaultErrMessage = 'Something went wrong'
  if (!e) return defaultErrMessage
  if (typeof e !== 'object') return defaultErrMessage
  if (
    'error' in e &&
    e.error &&
    typeof e.error === 'object' &&
    'message' in e.error &&
    typeof e.error.message === 'string'
  ) {
    return e.error.message
  }
  return defaultErrMessage
}
