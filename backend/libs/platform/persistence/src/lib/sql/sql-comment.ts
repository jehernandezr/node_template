import type { PersistenceContext } from '../context/persistence-context.js';

/** Caracteres que pueden ir en un valor del comentario. Lo demás se descarta. */
const SAFE_VALUE = /[^A-Za-z0-9_.:-]/g;

/** Largo máximo de cada valor dentro del comentario. */
const MAX_VALUE_LENGTH = 64;

function clean(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const safe = value.replace(SAFE_VALUE, '').slice(0, MAX_VALUE_LENGTH);
  return safe.length === 0 ? undefined : safe;
}

/**
 * Comentario `/* traceId=… tenantId=… *\/` que encabeza cada sentencia, para
 * ubicarla en Performance Insights y en `pg_stat_activity`. Los valores se
 * limpian (solo letras, dígitos, `_`, `.`, `:` y `-`), así un valor externo no
 * puede cerrar el comentario ni inyectar SQL. Devuelve `''` si no hay datos.
 */
export function sqlComment(context: PersistenceContext): string {
  const parts: string[] = [];
  const traceId = clean(context.traceId);
  const tenantId = clean(context.tenantId);
  if (traceId !== undefined) {
    parts.push(`traceId=${traceId}`);
  }
  if (tenantId !== undefined) {
    parts.push(`tenantId=${tenantId}`);
  }
  return parts.length === 0 ? '' : `/* ${parts.join(' ')} */ `;
}

/** Antepone el comentario de {@link sqlComment} a la sentencia. */
export function withSqlComment(
  sql: string,
  context: PersistenceContext,
): string {
  return `${sqlComment(context)}${sql}`;
}
