import type { ValueTransformer } from 'typeorm';

/** Columna `timestamptz` que siempre vuelve como `Date`, aunque el driver la entregue como texto. */
export class TimestampTransformer implements ValueTransformer {
  to(value: Date | null | undefined): Date | null | undefined {
    return value;
  }

  from(value: Date | string | null | undefined): Date | null | undefined {
    if (value === null || value === undefined) {
      return value;
    }
    return value instanceof Date ? value : new Date(value);
  }
}
