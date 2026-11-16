import { TenantId } from '@platform/kernel';
import { CanonicalJson, ClaimRules } from '@platform/primitives';

/** Segmentos que acotan una llave de idempotencia en el servidor. */
export interface IdempotencyKeySegments {
  readonly tenantId?: string;
  readonly operationId: string;
  readonly idempotencyKey: string;
}

/** Reglas de la llave de idempotencia de una llamada y de su forma en el almacén. */
export class IdempotencyKeyPolicy {
  /** Llave más larga que quien llama puede enviar. */
  static readonly MAX_CALL_KEY_LENGTH = 256;

  /** Tenant más largo aceptado como segmento de la llave: el mismo de toda la plataforma. */
  static readonly MAX_TENANT_ID_LENGTH = TenantId.MAX_LENGTH;

  /**
   * Llave del almacén: el arreglo JSON canónico `[tenantId, operationId, key]`
   * (un tenant ausente es `null`). El JSON escapa cada segmento, así que
   * ningún valor choca con otra partición, a diferencia de un texto unido con `|`.
   */
  static storeKey(segments: IdempotencyKeySegments): string {
    return CanonicalJson.stringify([
      segments.tenantId ?? null,
      segments.operationId,
      segments.idempotencyKey,
    ]);
  }

  /** Indica si la llave y el tenant que envía quien llama están dentro de los límites. */
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

  /** Indica si la llave del almacén cabe en el almacén de idempotencia. */
  static fitsStore(storeKey: string): boolean {
    return storeKey.length <= ClaimRules.MAX_KEY_LENGTH;
  }
}
