import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { HttpApplicationSetup } from '@platform/http/nest';
import { LambdaBootstrap } from '@platform/service/nest';
import { billingService } from './billing.service.js';

/** Billing API on Lambda: `api.runtime = "lambda"` in the service tfvars uses this handler. */
export const handler = LambdaBootstrap.http(billingService, {
  env: process.env,
  telemetry,
  http: { configurer: new HttpApplicationSetup() },
});
