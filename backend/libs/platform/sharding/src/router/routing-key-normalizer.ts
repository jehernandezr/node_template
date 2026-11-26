import { TenantId } from '@platform/kernel';
import { ShardingError } from '../errors/sharding-error.js';
import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import { ShardingGuard } from '../errors/sharding-guard.js';
import type { ShardKey } from '../model/shard-key.enum.js';

/** Validates and lowercases tenant ids and routing keys. */
export class RoutingKeyNormalizer {
  /**
   * @param tenantIdPattern Format of tenant ids, without the `g` or `y` flags.
   * @param maxKeyLength Maximum length of a routing key.
   * @throws ShardingError `InvalidConfiguration` if the pattern has `g` or `y`, or `maxKeyLength` is not a positive integer.
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
   * Validates and lowercases a tenant id.
   * @param raw Raw tenant id.
   * @returns The normalized id.
   * @throws ShardingError `KeyMissing` if it is not a non-empty string; `InvalidTenantId` if it exceeds
   *   `TenantId.MAX_LENGTH` or does not match the pattern.
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
   * Validates and normalizes a routing key of a kind.
   * @param keyKind Kind of key.
   * @param raw Raw key.
   * @returns The normalized key.
   * @throws ShardingError `KeyMissing` if it is not a non-empty string; `InvalidKey` if it exceeds
   *   `maxKeyLength`, before or after lowercasing.
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
