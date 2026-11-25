/** A statement of a generated migration, with its parameters if the schema uses them. */
export interface MigrationStatement {
  readonly query: string;
  readonly parameters?: readonly unknown[];
}
