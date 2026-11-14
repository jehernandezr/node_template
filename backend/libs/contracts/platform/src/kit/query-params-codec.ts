import type { z } from 'zod';
import { QueryValueKind } from '../enums/query-value-kind.enum.js';
import type { QueryParam, RawQueryValue } from './query-params.js';

/** Envoltorios de zod que no cambian el tipo del valor en la query. */
const TRANSPARENT = new Set(['optional', 'default', 'prefault', 'readonly']);

/** Número decimal en notación JSON. */
const NUMBER = /^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$/;

interface ZodDefLike {
  readonly type: string;
  readonly innerType?: z.ZodType;
  readonly element?: z.ZodType;
  readonly entries?: Readonly<Record<string, unknown>>;
  readonly values?: readonly unknown[];
}

/**
 * Describe qué campos de una petición viajan en la query y los convierte del
 * texto que entrega el servidor HTTP al tipo que declara el contrato.
 */
export class QueryParamsCodec {
  /**
   * Describe los campos de query de un esquema de petición. Cada campo debe ser
   * un escalar (texto, número, booleano, enum o literal) o una lista de
   * escalares; `fail` recibe el motivo cuando no lo es.
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
        fail(`el campo de query ${name}: ${outer}`);
      }
      let target = outer as z.ZodType;
      let list = false;
      const def = this.defOf(target);
      if (def.type === 'array' && def.element) {
        const inner = this.unwrap(def.element);
        if (typeof inner === 'string') {
          fail(`el campo de query ${name}: ${inner}`);
        }
        target = inner as z.ZodType;
        list = true;
      }
      const kind = this.scalarKind(target);
      if (kind === null) {
        fail(
          `el campo de query ${name} debe ser un escalar o una lista de escalares`,
        );
      }
      params.push(Object.freeze({ name, kind: kind as QueryValueKind, list }));
    }
    return params;
  }

  /**
   * Convierte los textos de la query al tipo que declara el contrato, antes de
   * validar con `validateContract(route.request, ...)`.
   *
   * Reglas: un número se acepta en notación JSON (`20`, `-1.5`); un booleano solo
   * como `true` o `false`; una lista acepta el parámetro repetido o un solo valor.
   * Lo que no se puede convertir se deja como texto, así la validación responde
   * `PLATFORM.VALIDATION.INVALID_TYPE` con el mismo campo que vería el cliente.
   * Los parámetros desconocidos se conservan para que un esquema estricto los
   * rechace con `PLATFORM.VALIDATION.UNKNOWN_FIELD`. Los parámetros de ruta no
   * pasan por aquí: llegan como texto y se validan como tal.
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
        return 'la query no puede llevar null; usa optional';
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

  /** Tipo escalar de un esquema, o null si no se puede enviar como texto. */
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
