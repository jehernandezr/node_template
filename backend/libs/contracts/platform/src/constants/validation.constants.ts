/** Reglas comunes de la validación de contratos. */
export const ValidationRules = {
  /** Separador entre los segmentos de la ruta de un campo, por ejemplo `items.0.name`. */
  fieldPathSeparator: '.',
  /** Prefijo de las claves ARB de los mensajes de error. */
  messageKeyPrefix: 'error_',
} as const;
