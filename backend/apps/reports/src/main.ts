import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { HttpApplicationSetup } from '@platform/http/nest';
import { ServiceBootstrap } from '@platform/service/nest';
import { reportsService } from './reports.service.js';

await ServiceBootstrap.http(reportsService, {
  env: process.env,
  telemetry,
  http: {
    port: Number(process.env['PORT'] ?? 3000),
    configurer: new HttpApplicationSetup(),
  },
});
