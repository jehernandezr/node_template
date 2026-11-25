import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { TenantMoveErrorCode } from './tenant-move-error-code.enum.js';

/** Catalog of `@platform/tenant-move`. No code reaches the client: an internal operation returns them. */
export const tenantMoveErrorCatalog = defineErrorCatalog(TenantMoveErrorCode, {
  [TenantMoveErrorCode.UnknownTarget]: ErrorSpecs.internal(
    400,
    false,
    'El grupo de destino no está configurado o su shard no está en el directorio.',
  ),
  [TenantMoveErrorCode.NotMovable]: ErrorSpecs.internal(
    409,
    false,
    'El tenant reparte sus datos en varios shards o ya vive en el destino.',
  ),
  [TenantMoveErrorCode.RoundPending]: ErrorSpecs.internal(
    503,
    true,
    'La ronda de copia sigue en curso; la saga repite la llamada.',
  ),
  [TenantMoveErrorCode.VerificationFailed]: ErrorSpecs.internal(
    409,
    false,
    'El destino no quedó igual al origen con el tenant congelado.',
  ),
  [TenantMoveErrorCode.TenantBusy]: ErrorSpecs.internal(
    409,
    false,
    'El tenant tiene sagas a medias en el origen; el traslado se cancela y se lanza de nuevo cuando terminen.',
  ),
  [TenantMoveErrorCode.NotSwitched]: ErrorSpecs.internal(
    409,
    false,
    'El servicio todavía enruta al tenant al shard de origen: la limpieza no borra datos vivos.',
  ),
  [TenantMoveErrorCode.MoveInProgress]: ErrorSpecs.internal(
    409,
    false,
    'Otro traslado del tenant todavía no pivota: la limpieza espera a que termine para no borrar su copia.',
  ),
  [TenantMoveErrorCode.TenantHasData]: ErrorSpecs.internal(
    409,
    false,
    'El tenant ya tiene datos en el servicio: no se retira del directorio.',
  ),
  [TenantMoveErrorCode.ShardTaken]: ErrorSpecs.internal(
    409,
    false,
    'El grupo de shards del tenant choca en el directorio del servicio con un tenant dedicado.',
  ),
  [TenantMoveErrorCode.InvalidManifest]: ErrorSpecs.internal(
    500,
    false,
    'El manifiesto de traslado del servicio no es válido.',
  ),
});
