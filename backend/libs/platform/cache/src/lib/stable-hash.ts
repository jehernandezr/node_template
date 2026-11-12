import {
  canonicalJson,
  fnv1a32Hex,
  MAX_CANONICAL_JSON_DEPTH,
  stableDigest as canonicalDigest,
} from '@platform/primitives';

function isPlainObject(value: object): boolean {
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Aplica `toJSON` (por ejemplo, de `Date`) en todos los niveles, como
 * `JSON.stringify`, y copia los objetos planos sin prototipo, así que una
 * llave `__proto__` queda como dato propio. Lo que no es JSON se deja igual
 * para que `canonicalize` de primitives lo rechace con `NonJsonValueError`;
 * por encima de `MAX_CANONICAL_JSON_DEPTH` (o en un ciclo) se deja de copiar
 * y primitives rechaza la profundidad o el ciclo.
 */
function toJsonValue(value: unknown, depth: number): unknown {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  if (depth > MAX_CANONICAL_JSON_DEPTH) {
    return value;
  }
  const withToJson = value as { toJSON?: unknown };
  if (typeof withToJson.toJSON === 'function') {
    return toJsonValue(
      (withToJson.toJSON as () => unknown).call(value),
      depth + 1,
    );
  }
  if (Array.isArray(value)) {
    return value.map((item: unknown) => toJsonValue(item, depth + 1));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const source = value as Record<string, unknown>;
  const copy = Object.create(null) as Record<string, unknown>;
  for (const key of Object.keys(source)) {
    copy[key] = toJsonValue(source[key], depth + 1);
  }
  return copy;
}

/**
 * Huella de los parámetros de una consulta para armar llaves de caché:
 * SHA-256 en hexadecimal (64 caracteres) del JSON canónico de primitives.
 * Las llaves se ordenan en todos los niveles, `Date` y otros valores con
 * `toJSON` se serializan como en `JSON.stringify`, y una llave `__proto__` es
 * un dato más. Rechaza con `NonJsonValueError` funciones, símbolos, bigint,
 * NaN, Infinity, instancias sin `toJSON` (Map, Set...), ciclos y anidamiento
 * excesivo, en vez de colapsarlos en la misma llave.
 */
export function queryDigest(params: unknown): string {
  return canonicalDigest(toJsonValue(params, 0));
}

/**
 * JSON con las llaves ordenadas en todos los niveles.
 * @deprecated Usa `canonicalJson` de `@platform/primitives`. Ahora rechaza
 * valores que no son JSON en lugar de omitirlos; `undefined` sigue dando `'null'`.
 */
export function stableStringify(value: unknown): string {
  return value === undefined ? 'null' : canonicalJson(toJsonValue(value, 0));
}

/**
 * SHA-256 del JSON canónico, recortado a 32 caracteres hexadecimales.
 * @deprecated Usa {@link queryDigest} (64 caracteres) o `stableDigest` de
 * `@platform/primitives`.
 */
export function stableDigest(value: unknown): string {
  return queryDigest(value).slice(0, 32);
}

/**
 * FNV-1a de 32 bits como 8 caracteres hexadecimales. No sirve para llaves.
 * @deprecated Usa `fnv1a32Hex` de `@platform/primitives`.
 */
export function fnv1a32(text: string): string {
  return fnv1a32Hex(text);
}

/**
 * FNV-1a del JSON canónico de un valor.
 * @deprecated Usa `fnv1a32Hex(canonicalJson(value))` de `@platform/primitives`.
 */
export function stableHash(value: unknown): string {
  return fnv1a32Hex(stableStringify(value));
}
