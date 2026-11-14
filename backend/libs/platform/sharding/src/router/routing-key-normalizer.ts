import { TenantId } from '@platform/kernel';
import { ShardingError } from '../errors/sharding-error.js';
import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import { ShardingGuard } from '../errors/sharding-guard.js';
import type { ShardKey } from '../model/shard-key.enum.js';

/** Valida y normaliza a minúsculas los ids de tenant y las claves de enrutamiento. */
export class RoutingKeyNormalizer {
  /**
   * @param tenantIdPattern Formato de los ids de tenant, sin las banderas `g` ni `y`.
   * @param maxKeyLength Longitud máxima de una clave de enrutamiento.
   * @throws ShardingError `InvalidConfiguration` si el patrón tiene `g` o `y`, o `maxKeyLength` no es un entero positivo.
   */
  constructor(
    private readonly tenantIdPattern: RegExp,
    private readonly maxKeyLength: number,
  ) {
    ShardingGuard.instance.positiveInteger('maxKeyLength', maxKeyLength);
    if (tenantIdPattern.global || tenantIdPattern.sticky) {
      throw new ShardingError(
        ShardingErrorCode.InvalidConfiguration,
        'tenantIdPattern must be a RegExp without the g or y flags',
        { details: { option: 'tenantIdPattern' } },
      );
    }
  }

  /**
   * @throws ShardingError `KeyMissing` si no es un texto no vacío; `InvalidTenantId` si supera
   *   `TenantId.MAX_LENGTH` o no cumple el patrón.
   */
  tenantId(raw: unknown): string {
    if (typeof raw !== 'string' || raw.length === 0) {
      throw new ShardingError(
        ShardingErrorCode.KeyMissing,
        'tenantId is required',
      );
    }
    if (raw.length > TenantId.MAX_LENGTH || !this.tenantIdPattern.test(raw)) {
      throw new ShardingError(
        ShardingErrorCode.InvalidTenantId,
        'tenantId does not have the expected format',
        { details: { length: raw.length } },
      );
    }
    return raw.toLowerCase();
  }

  /**
   * @throws ShardingError `KeyMissing` si no es un texto no vacío; `InvalidKey` si supera
   *   `maxKeyLength`, antes o después de pasar a minúsculas.
   */
  routingKey(keyKind: ShardKey, raw: unknown): string {
    if (typeof raw !== 'string' || raw.length === 0) {
      throw new ShardingError(
        ShardingErrorCode.KeyMissing,
        `keyValue is required for key kind "${keyKind}"`,
        { details: { keyKind } },
      );
    }
    if (raw.length > this.maxKeyLength) {
      throw new ShardingError(
        ShardingErrorCode.InvalidKey,
        'keyValue is longer than maxKeyLength',
        {
          details: {
            keyKind,
            length: raw.length,
            maxLength: this.maxKeyLength,
          },
        },
      );
    }
    const routingKey = raw.toLowerCase();
    if (routingKey.length > this.maxKeyLength) {
      throw new ShardingError(
        ShardingErrorCode.InvalidKey,
        'keyValue is longer than maxKeyLength once lowercased',
        { details: { keyKind, maxLength: this.maxKeyLength } },
      );
    }
    return routingKey;
  }
}
