/** Format of the platform identifiers (UUIDv7, RFC 9562). */
export const IdentifierFormat = {
  version: 7,
  /** Regular expression of a UUIDv7, in lowercase or uppercase. */
  pattern:
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$',
} as const;
