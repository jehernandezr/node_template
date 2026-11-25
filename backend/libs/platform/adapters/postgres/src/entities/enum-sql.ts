/** Builds the SQL text of an enum's values, for the `CHECK`s and partial indexes of the entities. */
export class EnumSql {
  /** `'a', 'b'` for an `IN (...)` list. */
  static list(values: readonly string[]): string {
    return values.map((value) => `'${value}'`).join(', ');
  }

  /** The same with all the values of a TypeScript string enum. */
  static of(enumObject: Readonly<Record<string, string>>): string {
    return EnumSql.list(Object.values(enumObject));
  }
}
