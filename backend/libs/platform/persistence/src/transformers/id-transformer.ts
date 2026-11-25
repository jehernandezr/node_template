import { Id } from '@platform/kernel';
import type { ValueTransformer } from 'typeorm';

/** TypeORM `uuid` column that is a kernel `Id` (UUIDv7) in code. */
export class IdTransformer implements ValueTransformer {
  to(value: Id | string | null | undefined): string | null | undefined {
    if (value === null || value === undefined) {
      return value;
    }
    return typeof value === 'string'
      ? Id.from(value).toString()
      : value.toString();
  }

  /** @throws InvalidIdError if the database returns a value that is not a UUIDv7. */
  from(value: string | null | undefined): Id | null | undefined {
    if (value === null || value === undefined) {
      return value;
    }
    return Id.from(value);
  }
}
