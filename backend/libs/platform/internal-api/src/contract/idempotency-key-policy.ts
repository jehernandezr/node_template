import { TenantId } from '@platform/kernel';
import { CanonicalJson, ClaimRules } from '@platform/primitives';

/** Segments that scope an idempotency key on the server. */
export interface IdempotencyKeySegments {
  readonly tenantId?: string;
  readonly operationId: string;
  readonly idempotencyKey: string;
}

/** Rules for the idempotency key of a call and its shape in the store. */
export class IdempotencyKeyPolicy {
  /** Longest key a caller can send. */
  static readonly MAX_CALL_KEY_LENGTH = 256;

  /** Longest tenant accepted as a key segment: the same as the whole platform's. */
  static readonly MAX_TENANT_ID_LENGTH = TenantId.MAX_LENGTH;

  /**
   * Returns the store key: the canonical JSON array `[tenantId, operationId, key]`
   * (a missing tenant is `null`). JSON escapes each segment, so
   * no value collides with another partition, unlike text joined with `|`.
   * @param segments Tenant, operation and key.
   * @returns The store key.
   */
  static storeKey(segments: IdempotencyKeySegments): string {
    return CanonicalJson.stringify([
      segments.tenantId ?? null,
      segments.operationId,
      segments.idempotencyKey,
    ]);
  }

  /**
   * Whether the key and the tenant the caller sends are within the limits.
   * @param idempotencyKey Key of the caller.
   * @param tenantId Tenant of the caller.
   * @returns `true` when valid.
   */
  static isValid(idempotencyKey: unknown, tenantId: unknown): boolean {
    if (
      typeof idempotencyKey !== 'string' ||
      idempotencyKey.trim() === '' ||
      idempotencyKey.length > IdempotencyKeyPolicy.MAX_CALL_KEY_LENGTH
    ) {
      return false;
    }
    return (
      tenantId === undefined ||
      (typeof tenantId === 'string' &&
        tenantId !== '' &&
        tenantId.length <= IdempotencyKeyPolicy.MAX_TENANT_ID_LENGTH)
    );
  }

  /**
   * Whether the store key fits in the idempotency store.
   * @param storeKey Store key.
   * @returns `true` when it fits.
   */
  static fitsStore(storeKey: string): boolean {
    return storeKey.length <= ClaimRules.MAX_KEY_LENGTH;
  }
}
