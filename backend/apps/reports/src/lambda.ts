import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { HttpApplicationSetup } from '@platform/http/nest';
import { LambdaBootstrap } from '@platform/service/nest';
import { reportsService } from './reports.service.js';

/** reports API on Lambda: `api.runtime = "lambda"` in the service tfvars uses this handler. */
export const handler = LambdaBootstrap.http(reportsService, {
  env: process.env,
  telemetry,
  http: { configurer: new HttpApplicationSetup() },
});
