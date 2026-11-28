import { Module } from '@nestjs/common';
import { CacheModule } from '@platform/cache/nest';
import { OutageProbeCache } from './outage-probe-cache.enum.js';
import { OutageProbeJob } from './outage-probe-job.js';

/** Business module of the outage probe: one cache namespace and one exclusive job, both on Valkey. */
@Module({
  imports: [CacheModule.forFeature({ namespace: OutageProbeCache.Namespace })],
  providers: [OutageProbeJob],
})
export class OutageProbeRootModule {}
