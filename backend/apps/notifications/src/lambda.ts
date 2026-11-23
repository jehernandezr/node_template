import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { HttpApplicationSetup } from '@platform/http/nest';
import { LambdaBootstrap } from '@platform/service/nest';
import { notificationsService } from './notifications.service.js';

/** API de notifications en Lambda: `api.runtime = "lambda"` en los tfvars del servicio usa este handler. */
export const handler = LambdaBootstrap.http(notificationsService, {
  env: process.env,
  telemetry,
  http: { configurer: new HttpApplicationSetup() },
});
