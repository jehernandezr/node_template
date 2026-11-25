import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { HttpApplicationSetup } from '@platform/http/nest';
import { LambdaBootstrap } from '@platform/service/nest';
import { notificationsService } from './notifications.service.js';

/** Notifications API on Lambda: `api.runtime = "lambda"` in the service's tfvars uses this handler. */
export const handler = LambdaBootstrap.http(notificationsService, {
  env: process.env,
  telemetry,
  http: { configurer: new HttpApplicationSetup() },
});
