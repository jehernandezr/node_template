import { Injectable } from '@nestjs/common';
import { EphemeralStore } from '../../../ephemeral/ephemeral-store.js';
import { IdentityCacheKey } from '../../../shared/enums/identity-cache-key.enum.js';
import {
  ApiKeyUsageBuffer,
  type ApiKeyUsage,
} from '../domain/api-key-usage-buffer.js';

/** Un mapa en Valkey con un campo por key: cada uso pisa el anterior, así el mapa no crece con el tráfico. */
@Injectable()
export class EphemeralApiKeyUsageBuffer extends ApiKeyUsageBuffer {
  /** Si el job deja de correr, lo acumulado se pierde en un día en vez de quedarse para siempre. */
  private static readonly TTL_MS = 24 * 60 * 60_000;
  private static readonly SEPARATOR = '/';

  constructor(private readonly store: EphemeralStore) {
    super();
  }

  async record(usage: ApiKeyUsage): Promise<void> {
    await this.store.putField(
      IdentityCacheKey.ApiKeyUsage,
      [usage.tenantId, usage.apiKeyId].join(
        EphemeralApiKeyUsageBuffer.SEPARATOR,
      ),
      usage.lastUsedAt.toISOString(),
      EphemeralApiKeyUsageBuffer.TTL_MS,
    );
  }

  async drain(): Promise<readonly ApiKeyUsage[]> {
    const fields = await this.store.takeFields(IdentityCacheKey.ApiKeyUsage);
    return [...fields].flatMap(([field, value]) => {
      const [tenantId, apiKeyId] = field.split(
        EphemeralApiKeyUsageBuffer.SEPARATOR,
      );
      const lastUsedAt = new Date(value);
      return tenantId === undefined ||
        apiKeyId === undefined ||
        Number.isNaN(lastUsedAt.getTime())
        ? []
        : [{ tenantId, apiKeyId, lastUsedAt }];
    });
  }
}
