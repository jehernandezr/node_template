import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { SchedulingMode } from '@platform/scheduling';
import { ServiceBootstrap } from '@platform/service/nest';
import { billingService } from './billing.service.js';
import { SeedPlans } from './modules/plans/index.js';

// Seeds the plan catalog without running jobs: it is a deployment step, after migrating.
const running = await ServiceBootstrap.worker(billingService, {
  env: process.env,
  telemetry,
  schedulingMode: SchedulingMode.External,
});
try {
  await running.app.get(SeedPlans).execute();
  process.exitCode = 0;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await running.stop();
}
