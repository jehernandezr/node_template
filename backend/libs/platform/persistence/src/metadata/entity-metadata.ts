/** Class of a persisted record. */
export type EntityClass = abstract new (...args: never[]) => object;

/** Options of {@link Audited}. */
export interface AuditedOptions {
  /** Columns that are never copied to `audit_log`, for example `password_hash`. */
  readonly exclude?: readonly string[];
}

const audited = new WeakMap<object, AuditedOptions>();

/**
 * The record table carries the audit trigger. The migration creates it
 * with `auditTriggerSqlFor(Record, table)`, so the excluded columns are
 * declared once, next to the record.
 */
export function Audited(options: AuditedOptions = {}): ClassDecorator {
  return (target) => {
    audited.set(target, { exclude: [...(options.exclude ?? [])] });
  };
}

/** `@Audited` options of the record, if it has them. */
export function auditedOptionsOf(
  entity: EntityClass,
): AuditedOptions | undefined {
  return audited.get(entity);
}
