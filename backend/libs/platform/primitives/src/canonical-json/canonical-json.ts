import { createHash } from 'node:crypto';
import { NonJsonValueError } from '../errors/non-json-value.error.js';

/** JSON value. Canonical objects have no prototype. */
export type CanonicalJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalJsonValue[]
  | { readonly [key: string]: CanonicalJsonValue };

/** Canonical JSON: same sorted keys and same numbers, regardless of the value's origin. */
export class CanonicalJson {
  /** Maximum accepted nesting depth. */
  static readonly MAX_DEPTH = 128;

  /**
   * Returns a deep copy of `value` with the keys of each object sorted and objects
   * without a prototype. Accepts null, booleans, finite numbers, strings, arrays and
   * plain objects. Rejects with `NonJsonValueError` (with the path of the value)
   * undefined (except as a property value, which is omitted), functions,
   * symbols, bigint, NaN, Infinity, class instances (Date, Map, Set,
   * Buffer...), cycles and nesting greater than `MAX_DEPTH`.
   */
  static canonicalize(value: unknown): CanonicalJsonValue {
    return CanonicalJson.canonicalizeAt(value, '$', new Set());
  }

  /**
   * Returns deterministic JSON text: keys sorted by UTF-16 code unit at
   * all levels and without whitespace. Two structurally equal values
   * produce the same text regardless of insertion order.
   */
  static stringify(value: unknown): string {
    return CanonicalJson.serialize(CanonicalJson.canonicalize(value));
  }

  /** Returns the SHA-256 fingerprint in hexadecimal (64 characters) of the canonical text of `value`. */
  static digest(value: unknown): string {
    return createHash('sha256')
      .update(CanonicalJson.stringify(value))
      .digest('hex');
  }

  private static isPlainObject(value: object): boolean {
    const proto: unknown = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  private static describe(value: unknown): string {
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

  private static childPath(path: string, key: string): string {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
      ? `${path}.${key}`
      : `${path}[${JSON.stringify(key)}]`;
  }

  /**
   * JSON does not distinguish -0 from 0.
   * The holes of a sparse array arrive as undefined and are rejected.
   * No prototype: a `__proto__` or `constructor` key stays as own data.
   * Same as JSON.stringify: an undefined property is equivalent to not having it.
   */
  private static canonicalizeAt(
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
        return value === 0 ? 0 : value;
      case 'object':
        break;
      default:
        throw new NonJsonValueError(path, CanonicalJson.describe(value));
    }
    if (value === null) {
      return null;
    }
    if (ancestors.has(value)) {
      throw new NonJsonValueError(path, 'circular reference');
    }
    if (ancestors.size >= CanonicalJson.MAX_DEPTH) {
      throw new NonJsonValueError(
        path,
        `nesting deeper than ${CanonicalJson.MAX_DEPTH}`,
      );
    }

    ancestors.add(value);
    try {
      if (Array.isArray(value)) {
        const items: CanonicalJsonValue[] = [];
        for (let index = 0; index < value.length; index += 1) {
          items.push(
            CanonicalJson.canonicalizeAt(
              (value as unknown[])[index],
              `${path}[${index}]`,
              ancestors,
            ),
          );
        }
        return items;
      }
      if (!CanonicalJson.isPlainObject(value)) {
        throw new NonJsonValueError(path, CanonicalJson.describe(value));
      }
      const source = value as Record<string, unknown>;
      const sorted = Object.create(null) as Record<string, CanonicalJsonValue>;
      for (const key of Object.keys(source).sort()) {
        const child = source[key];
        if (child !== undefined) {
          sorted[key] = CanonicalJson.canonicalizeAt(
            child,
            CanonicalJson.childPath(path, key),
            ancestors,
          );
        }
      }
      return sorted;
    } finally {
      ancestors.delete(value);
    }
  }

  /**
   * JSON.stringify lists index-like keys ("2", "10") first in
   * numeric order, so the text is built by hand to respect UTF-16 order.
   */
  private static serialize(value: CanonicalJsonValue): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${(value as readonly CanonicalJsonValue[]).map((item) => CanonicalJson.serialize(item)).join(',')}]`;
    }
    const record = value as { readonly [key: string]: CanonicalJsonValue };
    const members = Object.keys(record)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${CanonicalJson.serialize(record[key])}`,
      );
    return `{${members.join(',')}}`;
  }
}
