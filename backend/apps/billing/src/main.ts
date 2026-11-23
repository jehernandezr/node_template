import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { HttpApplicationSetup } from '@platform/http/nest';
import { ServiceBootstrap } from '@platform/service/nest';
import { billingService } from './billing.service.js';

await ServiceBootstrap.http(billingService, {
  env: process.env,
  telemetry,
  http: {
    port: Number(process.env['PORT'] ?? 3000),
    configurer: new HttpApplicationSetup(),
  },
});
