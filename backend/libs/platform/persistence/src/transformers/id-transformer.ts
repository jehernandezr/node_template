import { Id } from '@platform/kernel';
import type { ValueTransformer } from 'typeorm';

/** Columna `uuid` de TypeORM que en el código es un `Id` (UUIDv7) del kernel. */
export class IdTransformer implements ValueTransformer {
  to(value: Id | string | null | undefined): string | null | undefined {
    if (value === null || value === undefined) {
      return value;
    }
    return typeof value === 'string'
      ? Id.from(value).toString()
      : value.toString();
  }

  /** @throws InvalidIdError si la base devuelve un valor que no es UUIDv7. */
  from(value: string | null | undefined): Id | null | undefined {
    if (value === null || value === undefined) {
      return value;
    }
    return Id.from(value);
  }
}
