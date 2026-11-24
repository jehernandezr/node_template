import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { parseArgs } from 'node:util';
import { SchedulingMode } from '@platform/scheduling';
import { ServiceBootstrap } from '@platform/service/nest';
import { identityService } from './identity.service.js';
import { StartTenantMove } from './modules/tenant-moves/index.js';

// Lanza un traslado y corre su saga hasta terminar o pausarse; si se pausa, la retoma el worker. No hay ruta HTTP:
// queda auditado con el commit que lo ejecuta.
const { values } = parseArgs({
  options: {
    tenant: { type: 'string' },
    target: { type: 'string' },
  },
  strict: true,
});

if (values.tenant === undefined || values.target === undefined) {
  console.error(
    'Uso: tenant-move --tenant=<id del tenant> --target=<grupo de destino>',
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
