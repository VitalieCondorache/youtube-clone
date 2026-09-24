// Reads the message of an API error. The body can be empty (proxy or server errors),
// so it is never read blindly.
export const readApiError = (
  err: { error?: { message?: string }; message?: string } | null | undefined,
  fallback: string
): string => err?.error?.message || err?.message || fallback;
