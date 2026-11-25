import type { ValueTransformer } from 'typeorm';

/** `timestamptz` column that always comes back as a `Date`, even if the driver returns it as text. */
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
