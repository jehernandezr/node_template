/** Common rules of contract validation. */
export const ValidationRules = {
  /** Separator between the segments of a field path, for example `items.0.name`. */
  fieldPathSeparator: '.',
  /** Prefix of the ARB keys of error messages. */
  messageKeyPrefix: 'error_',
} as const;
