import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { HttpApplicationSetup } from '@platform/http/nest';
import { LambdaBootstrap } from '@platform/service/nest';
import { tasksService } from './tasks.service.js';

/** API de tasks en Lambda: `api.runtime = "lambda"` en los tfvars del servicio usa este handler. */
export const handler = LambdaBootstrap.http(tasksService, {
  env: process.env,
  telemetry,
  http: { configurer: new HttpApplicationSetup() },
});
