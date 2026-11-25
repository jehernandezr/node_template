import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { SchedulingMode } from '@platform/scheduling';
import { ServiceBootstrap } from '@platform/service/nest';
import { identityService } from './identity.service.js';
import { SeedRegionTenants } from './modules/tenants/index.js';

// Seeds the region's fixed tenants without running jobs: it is a deployment step, after migrating.
const running = await ServiceBootstrap.worker(identityService, {
  env: process.env,
  telemetry,
  schedulingMode: SchedulingMode.External,
});
try {
  await running.app.get(SeedRegionTenants).execute();
  process.exitCode = 0;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await running.stop();
}
