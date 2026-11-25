import { Injectable } from '@nestjs/common';
import { EphemeralStore } from '../../../ephemeral/ephemeral-store.js';
import { IdentityCacheKey } from '../../../shared/enums/identity-cache-key.enum.js';
import {
  ApiKeyUsageBuffer,
  type ApiKeyUsage,
} from '../domain/api-key-usage-buffer.js';

/** A Valkey map with one field per key: each use overwrites the previous one, so the map does not grow with traffic. */
@Injectable()
export class EphemeralApiKeyUsageBuffer extends ApiKeyUsageBuffer {
  /** If the job stops running, what was accumulated is lost within a day instead of staying forever. */
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
