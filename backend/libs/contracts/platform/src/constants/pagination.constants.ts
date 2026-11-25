/** Limits of cursor pagination. */
export const Pagination = {
  /** Page size when the request does not specify `limit`. */
  defaultLimit: 20,
  /** Maximum page size a route accepts. */
  maxLimit: 100,
  /** Maximum length of an opaque cursor. */
  maxCursorLength: 512,
  /** Regular expression of the cursor: base64url without padding. */
  cursorPattern: '^[A-Za-z0-9_-]+$',
} as const;
