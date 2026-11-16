import { FailureKind, PlatformError } from '@platform/kernel';
import { ShardingErrorCode } from './sharding-error-code.enum.js';

/**
 * Cómo falla cada código. Solo `TenantMigrating` es transitorio: la saga de
 * traslado termina y la misma petición funciona. Una clave ausente, una
 * transacción entre shards o una opción inválida son fallas del llamador, es
 * decir violaciones de protocolo.
 */
const FAILURE_KIND: Readonly<Record<ShardingErrorCode, FailureKind>> = {
  [ShardingErrorCode.KeyMissing]: FailureKind.ProtocolViolation,
  [ShardingErrorCode.CrossShardTransaction]: FailureKind.ProtocolViolation,
  [ShardingErrorCode.TenantMigrating]: FailureKind.Transient,
  [ShardingErrorCode.TenantNotWritable]: FailureKind.Permanent,
  [ShardingErrorCode.UnknownTenant]: FailureKind.Permanent,
  [ShardingErrorCode.UnknownShard]: FailureKind.Permanent,
  [ShardingErrorCode.WrongRegion]: FailureKind.Permanent,
  [ShardingErrorCode.InvalidTenantId]: FailureKind.Permanent,
  [ShardingErrorCode.InvalidKey]: FailureKind.Permanent,
  [ShardingErrorCode.InvalidConfiguration]: FailureKind.ProtocolViolation,
};

/** Opciones de un {@link ShardingError}. `retryable` sale del código. */
export interface ShardingErrorOptions {
  /** Datos de diagnóstico. Nunca secretos ni valores crudos de la petición más allá de identificadores. */
  readonly details?: Readonly<Record<string, unknown>>;
  readonly cause?: unknown;
}

/**
 * Error de `@platform/sharding`, identificado por un {@link ShardingErrorCode}
 * estable. `retryable` y `failureKind` salen del código, así que
 * `FailureClassifier` de `@platform/primitives` los lee directamente.
 */
export class ShardingError extends PlatformError {
  override readonly code: ShardingErrorCode;
  declare readonly failureKind: FailureKind;

  constructor(
    code: ShardingErrorCode,
    message: string,
    options: ShardingErrorOptions = {},
  ) {
    const failureKind = FAILURE_KIND[code];
    super(message, {
      retryable: failureKind === FailureKind.Transient,
      failureKind,
      details: options.details,
      cause: options.cause,
    });
    this.code = code;
  }
}
