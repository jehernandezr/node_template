import type { z } from 'zod';
import { QueryValueKind } from '../enums/query-value-kind.enum.js';
import type { QueryParam, RawQueryValue } from './query-params.js';

/** zod wrappers that do not change the type of the value in the query. */
const TRANSPARENT = new Set(['optional', 'default', 'prefault', 'readonly']);

/** Decimal number in JSON notation. */
const NUMBER = /^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$/;

interface ZodDefLike {
  readonly type: string;
  readonly innerType?: z.ZodType;
  readonly element?: z.ZodType;
  readonly entries?: Readonly<Record<string, unknown>>;
  readonly values?: readonly unknown[];
}

/**
 * Describes which fields of a request travel in the query and converts them from the
 * text the HTTP server delivers to the type the contract declares.
 */
export class QueryParamsCodec {
  /**
   * Describes the query fields of a request schema. Each field must be
   * a scalar (string, number, boolean, enum or literal) or a list of
   * scalars; `fail` receives the reason when it is not.
   */
  describe(
    shape: Readonly<Record<string, z.ZodType>>,
    include: (name: string) => boolean,
    fail: (reason: string) => never,
  ): QueryParam[] {
    const params: QueryParam[] = [];
    for (const [name, field] of Object.entries(shape)) {
      if (!include(name)) continue;
      const outer = this.unwrap(field);
      if (typeof outer === 'string') {
        fail(`query field ${name}: ${outer}`);
      }
      let target = outer as z.ZodType;
      let list = false;
      const def = this.defOf(target);
      if (def.type === 'array' && def.element) {
        const inner = this.unwrap(def.element);
        if (typeof inner === 'string') {
          fail(`query field ${name}: ${inner}`);
        }
        target = inner as z.ZodType;
        list = true;
      }
      const kind = this.scalarKind(target);
      if (kind === null) {
        fail(`query field ${name} must be a scalar or a list of scalars`);
      }
      params.push(Object.freeze({ name, kind: kind as QueryValueKind, list }));
    }
    return params;
  }

  /**
   * Converts the query strings to the type the contract declares, before
   * validating with `validateContract(route.request, ...)`.
   *
   * Rules: a number is accepted in JSON notation (`20`, `-1.5`); a boolean only
   * as `true` or `false`; a list accepts the repeated parameter or a single value.
   * Whatever cannot be converted is left as text, so validation responds
   * `PLATFORM.VALIDATION.INVALID_TYPE` with the same field the client would see.
   * Unknown parameters are kept so a strict schema rejects them
   * with `PLATFORM.VALIDATION.UNKNOWN_FIELD`. Path parameters do not
   * go through here: they arrive as text and are validated as such.
   */
  decode(
    route: { readonly queryParams: readonly QueryParam[] },
    query: Readonly<Record<string, RawQueryValue>>,
  ): Record<string, unknown> {
    const byName = new Map(route.queryParams.map((p) => [p.name, p]));
    const result: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(query)) {
      if (value === undefined) continue;
      const param = byName.get(name);
      if (!param) {
        result[name] = value;
        continue;
      }
      const values: readonly unknown[] = Array.isArray(value) ? value : [value];
      if (param.list) {
        result[name] = values.map((v) =>
          typeof v === 'string' ? this.convert(param.kind, v) : v,
        );
      } else if (values.length === 1 && typeof values[0] === 'string') {
        result[name] = this.convert(param.kind, values[0]);
      } else {
        result[name] = value;
      }
    }
    return result;
  }

  private defOf(schema: z.ZodType): ZodDefLike {
    return schema._zod.def as unknown as ZodDefLike;
  }

  private unwrap(schema: z.ZodType): z.ZodType | string {
    let current = schema;
    for (;;) {
      const def = this.defOf(current);
      if (def.type === 'nullable') {
        return 'the query cannot carry null; use optional';
      }
      if (!TRANSPARENT.has(def.type) || !def.innerType) return current;
      current = def.innerType;
    }
  }

  private kindOfValues(values: readonly unknown[]): QueryValueKind | null {
    if (values.length === 0) return null;
    if (values.every((v) => typeof v === 'string')) {
      return QueryValueKind.String;
    }
    if (values.every((v) => typeof v === 'number')) {
      return QueryValueKind.Number;
    }
    if (values.every((v) => typeof v === 'boolean')) {
      return QueryValueKind.Boolean;
    }
    return null;
  }

  /** Scalar type of a schema, or null if it cannot be sent as text. */
  private scalarKind(schema: z.ZodType): QueryValueKind | null {
    const def = this.defOf(schema);
    switch (def.type) {
      case 'string':
        return QueryValueKind.String;
      case 'number':
        return QueryValueKind.Number;
      case 'boolean':
        return QueryValueKind.Boolean;
      case 'enum':
        return this.kindOfValues(Object.values(def.entries ?? {}));
      case 'literal':
        return this.kindOfValues(def.values ?? []);
      default:
        return null;
    }
  }

  private convert(kind: QueryValueKind, text: string): unknown {
    switch (kind) {
      case QueryValueKind.Number:
        return NUMBER.test(text) ? Number(text) : text;
      case QueryValueKind.Boolean:
        return text === 'true' ? true : text === 'false' ? false : text;
      default:
        return text;
    }
  }
}
