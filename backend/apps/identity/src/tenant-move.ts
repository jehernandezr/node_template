import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { parseArgs } from 'node:util';
import { SchedulingMode } from '@platform/scheduling';
import { ServiceBootstrap } from '@platform/service/nest';
import { identityService } from './identity.service.js';
import { StartTenantMove } from './modules/tenant-moves/index.js';

// Launches a move and runs its saga until it finishes or pauses; if it pauses, the worker resumes it. There is no HTTP route:
// it is audited with the commit that runs it.
const { values } = parseArgs({
  options: {
    tenant: { type: 'string' },
    target: { type: 'string' },
  },
  strict: true,
});

if (values.tenant === undefined || values.target === undefined) {
  console.error(
    'Usage: tenant-move --tenant=<tenant id> --target=<target group>',
  );
  process.exitCode = 2;
} else {
  const running = await ServiceBootstrap.worker(identityService, {
    env: process.env,
    telemetry,
    schedulingMode: SchedulingMode.External,
  });
  try {
    const launch = await running.app.get(StartTenantMove).execute({
      tenantId: values.tenant,
      targetGroup: values.target,
    });
    console.log(JSON.stringify(launch));
    process.exitCode = 0;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await running.stop();
  }
}
