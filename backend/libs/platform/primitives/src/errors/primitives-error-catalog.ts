import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { PrimitivesErrorCode } from './primitives-error-code.enum.js';

/** Catálogo de los códigos de `@platform/primitives`; ninguno llega al cliente. */
export const primitivesErrorCatalog = defineErrorCatalog(PrimitivesErrorCode, {
  [PrimitivesErrorCode.InvalidArgument]: ErrorSpecs.internal(
    500,
    false,
    'Argumento inválido en una primitiva de plataforma.',
  ),
  [PrimitivesErrorCode.NonJsonValue]: ErrorSpecs.internal(
    500,
    false,
    'Un valor no se puede serializar como JSON canónico.',
  ),
  [PrimitivesErrorCode.DeadlineExceeded]: ErrorSpecs.internal(
    504,
    false,
    'Se agotó el plazo de la operación.',
  ),
  [PrimitivesErrorCode.StaleClaim]: ErrorSpecs.internal(
    409,
    false,
    'El claim de idempotencia ya pertenece a otro dueño.',
  ),
});
