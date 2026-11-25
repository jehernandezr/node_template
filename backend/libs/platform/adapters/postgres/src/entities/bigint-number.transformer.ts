import type { ValueTransformer } from 'typeorm';

/** `bigint` column that is a `number` in the code: the driver delivers it as text. */
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
