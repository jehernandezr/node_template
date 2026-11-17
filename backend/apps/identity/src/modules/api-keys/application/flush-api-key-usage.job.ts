import { Injectable } from '@nestjs/common';
import {
  JobScheduleKind,
  ScheduledJob,
  type JobSchedule,
} from '@platform/kernel';
import { IdentityJob } from '../../../shared/enums/identity-job.enum.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { ApiKeyRepository } from '../domain/api-key-store.js';
import { ApiKeyUsageBuffer } from '../domain/api-key-usage-buffer.js';

/** Vuelca a cada shard el último uso de las API keys que acumuló el buffer. */
@Injectable()
export class FlushApiKeyUsageJob extends ScheduledJob {
  private static readonly EVERY_MS = 60_000;

  readonly name = IdentityJob.FlushApiKeyUsage;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: FlushApiKeyUsageJob.EVERY_MS,
  };
  override readonly exclusive = true;

  constructor(
    private readonly buffer: ApiKeyUsageBuffer,
    private readonly repository: ApiKeyRepository,
    private readonly scopes: IdentityShardScopes,
  ) {
    super();
  }

  async run(): Promise<void> {
    for (const usage of await this.buffer.drain()) {
      await this.scopes.inTenantShard(usage.tenantId, () =>
        this.repository.touchLastUsed(usage.apiKeyId, usage.lastUsedAt),
      );
    }
  }
}
