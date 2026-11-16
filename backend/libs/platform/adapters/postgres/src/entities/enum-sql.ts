/** Arma el texto SQL de los valores de un enum, para los `CHECK` y los índices parciales de las entidades. */
export class EnumSql {
  /** `'a', 'b'` para una lista `IN (...)`. */
  static list(values: readonly string[]): string {
    return values.map((value) => `'${value}'`).join(', ');
  }

  /** Lo mismo con todos los valores de un enum de TypeScript de cadenas. */
  static of(enumObject: Readonly<Record<string, string>>): string {
    return EnumSql.list(Object.values(enumObject));
  }
}
