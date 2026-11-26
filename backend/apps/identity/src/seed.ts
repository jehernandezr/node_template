import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { SchedulingMode } from '@platform/scheduling';
import { ServiceBootstrap } from '@platform/service/nest';
import { identityService } from './identity.service.js';
import { SeedSmokeAccount } from './smoke-account/seed-smoke-account.js';
import { SeedRegionTenants } from './modules/tenants/index.js';

/**
 * Seeds the region's fixed tenants and, when `IDENTITY_SMOKE_ACCOUNT` is set, the smoke account, without running
 * jobs or consuming queues: it is a deployment step, after migrating.
 */
const running = await ServiceBootstrap.worker(identityService, {
  env: process.env,
  telemetry,
  schedulingMode: SchedulingMode.External,
  consumeQueues: false,
});
try {
  await running.app.get(SeedRegionTenants).execute();
  await running.app.get(SeedSmokeAccount).execute();
  process.exitCode = 0;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await running.stop();
}
