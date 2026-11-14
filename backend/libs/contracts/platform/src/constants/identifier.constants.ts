/** Formato de los identificadores de la plataforma (UUIDv7, RFC 9562). */
export const IdentifierFormat = {
  version: 7,
  /** Expresión regular de un UUIDv7, en minúsculas o mayúsculas. */
  pattern:
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$',
} as const;
