import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { SchedulingMode } from '@platform/scheduling';
import { ServiceBootstrap } from '@platform/service/nest';
import { identityService } from './identity.service.js';
import { SeedRegionTenants } from './modules/tenants/index.js';

// Siembra los tenants fijos de la región sin correr jobs: es un paso del despliegue, después de migrar.
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
