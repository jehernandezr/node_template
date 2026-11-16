import type { ValueTransformer } from 'typeorm';

/** Columna `bigint` que en el código es un `number`: el driver la entrega como texto. */
export class BigintNumberTransformer implements ValueTransformer {
  to(value: number | null | undefined): number | null | undefined {
    return value;
  }

  from(value: string | number | null | undefined): number | null | undefined {
    if (value === null || value === undefined) {
      return value;
    }
    return Number(value);
  }
}
