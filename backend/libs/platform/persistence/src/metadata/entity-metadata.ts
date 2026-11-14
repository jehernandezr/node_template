/** Clase de un registro persistido. */
export type EntityClass = abstract new (...args: never[]) => object;

/** Opciones de {@link Audited}. */
export interface AuditedOptions {
  /** Columnas que nunca se copian a `audit_log`, por ejemplo `password_hash`. */
  readonly exclude?: readonly string[];
}

const audited = new WeakMap<object, AuditedOptions>();

/**
 * La tabla del registro lleva el trigger de auditoría. La migración lo crea
 * con `auditTriggerSqlFor(Registro, tabla)`, así las columnas excluidas se
 * declaran una vez, junto al registro.
 */
export function Audited(options: AuditedOptions = {}): ClassDecorator {
  return (target) => {
    audited.set(target, { exclude: [...(options.exclude ?? [])] });
  };
}

/** Opciones de `@Audited` del registro, si lo lleva. */
export function auditedOptionsOf(
  entity: EntityClass,
): AuditedOptions | undefined {
  return audited.get(entity);
}
