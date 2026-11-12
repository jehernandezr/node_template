import { createHash } from 'node:crypto';
import { NonJsonValueError } from './errors.js';

/** Valor JSON. Los objetos canónicos no tienen prototipo. */
export type CanonicalJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalJsonValue[]
  | { readonly [key: string]: CanonicalJsonValue };

/** Profundidad máxima de anidamiento aceptada. */
export const MAX_CANONICAL_JSON_DEPTH = 128;

function isPlainObject(value: object): boolean {
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function describe(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value !== 'object') {
    return typeof value;
  }
  const ctor = (Object.getPrototypeOf(value) as { constructor?: unknown })
    ?.constructor;
  return typeof ctor === 'function' && ctor.name !== ''
    ? `${ctor.name} instance`
    : 'non-plain object';
}

function childPath(path: string, key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`;
}

function canonicalizeAt(
  value: unknown,
  path: string,
  ancestors: Set<object>,
): CanonicalJsonValue {
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return value;
    case 'number':
      if (!Number.isFinite(value)) {
        throw new NonJsonValueError(path, 'non-finite number');
      }
      // JSON no distingue -0 de 0.
      return value === 0 ? 0 : value;
    case 'object':
      break;
    default:
      throw new NonJsonValueError(path, describe(value));
  }
  if (value === null) {
    return null;
  }
  if (ancestors.has(value)) {
    throw new NonJsonValueError(path, 'circular reference');
  }
  if (ancestors.size >= MAX_CANONICAL_JSON_DEPTH) {
    throw new NonJsonValueError(
      path,
      `nesting deeper than ${MAX_CANONICAL_JSON_DEPTH}`,
    );
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const items: CanonicalJsonValue[] = [];
      for (let index = 0; index < value.length; index += 1) {
        // Los huecos de un arreglo disperso llegan como undefined y se rechazan.
        items.push(
          canonicalizeAt(
            (value as unknown[])[index],
            `${path}[${index}]`,
            ancestors,
          ),
        );
      }
      return items;
    }
    if (!isPlainObject(value)) {
      throw new NonJsonValueError(path, describe(value));
    }
    const source = value as Record<string, unknown>;
    // Sin prototipo: una llave `__proto__` o `constructor` queda como dato propio.
    const sorted = Object.create(null) as Record<string, CanonicalJsonValue>;
    for (const key of Object.keys(source).sort()) {
      const child = source[key];
      // Igual que JSON.stringify: una propiedad undefined equivale a no tenerla.
      if (child !== undefined) {
        sorted[key] = canonicalizeAt(child, childPath(path, key), ancestors);
      }
    }
    return sorted;
  } finally {
    ancestors.delete(value);
  }
}

/**
 * Copia profunda de `value` con las llaves de cada objeto ordenadas y objetos
 * sin prototipo. Acepta null, booleanos, números finitos, strings, arreglos y
 * objetos planos. Rechaza con `NonJsonValueError` undefined (salvo como valor de
 * una propiedad, que se omite), funciones, símbolos, bigint, NaN, Infinity,
 * instancias de clases (Date, Map, Set, Buffer...), ciclos y anidamiento
 * mayor a `MAX_CANONICAL_JSON_DEPTH`.
 */
export function canonicalize(value: unknown): CanonicalJsonValue {
  return canonicalizeAt(value, '$', new Set());
}

/**
 * Serializa `value` como JSON determinista: llaves ordenadas por unidad de
 * código UTF-16 en todos los niveles y sin espacios. Dos valores iguales en
 * estructura producen el mismo texto sin importar el orden de inserción.
 */
export function canonicalJson(value: unknown): string {
  return serialize(canonicalize(value));
}

/**
 * JSON.stringify enumera primero las llaves con forma de índice ("2", "10") en
 * orden numérico, así que el texto se arma a mano para respetar el orden UTF-16.
 */
function serialize(value: CanonicalJsonValue): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${(value as readonly CanonicalJsonValue[]).map(serialize).join(',')}]`;
  }
  const record = value as { readonly [key: string]: CanonicalJsonValue };
  const members = Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${serialize(record[key])}`);
  return `{${members.join(',')}}`;
}

/** SHA-256 en hexadecimal (64 caracteres) del JSON canónico de `value`. */
export function stableDigest(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}
