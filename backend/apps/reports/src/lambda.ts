import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { HttpApplicationSetup } from '@platform/http/nest';
import { LambdaBootstrap } from '@platform/service/nest';
import { reportsService } from './reports.service.js';

/** API de reports en Lambda: `api.runtime = "lambda"` en los tfvars del servicio usa este handler. */
export const handler = LambdaBootstrap.http(reportsService, {
  env: process.env,
  telemetry,
  http: { configurer: new HttpApplicationSetup() },
});
