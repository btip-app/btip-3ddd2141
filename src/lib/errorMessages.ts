/**
 * Maps database/API errors to safe, user-friendly messages.
 * Prevents leaking internal database structure to the client.
 */
export function mapDatabaseError(error: { message?: string; code?: string } | null): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const code = error.code || '';
  const msg = (error.message || '').toLowerCase();

  // Duplicate key
  if (code === '23505' || msg.includes('duplicate')) {
    return 'This item already exists.';
  }

  // Foreign key violation
  if (code === '23503') {
    return 'This item is referenced by other records and cannot be modified.';
  }

  // Not-null violation
  if (code === '23502') {
    return 'A required field is missing. Please fill in all required fields.';
  }

  // RLS policy denial
  if (msg.includes('row-level security') || msg.includes('rls') || code === '42501') {
    return 'You do not have permission to perform this action.';
  }

  // Check constraint
  if (code === '23514') {
    return 'The provided value is not valid. Please check your input.';
  }

  // Auth errors
  if (msg.includes('jwt') || msg.includes('token') || msg.includes('unauthorized')) {
    return 'Your session has expired. Please sign in again.';
  }

  // Rate limiting
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Generic fallback — never expose raw message
  return 'An unexpected error occurred. Please try again.';
}
