import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { HttpApplicationSetup } from '@platform/http/nest';
import { LambdaBootstrap } from '@platform/service/nest';
import { __nameCamel__Service } from './__name__.service.js';

/** __name__ API on Lambda: `api.runtime = "lambda"` in the service tfvars uses this handler. */
export const handler = LambdaBootstrap.http(__nameCamel__Service, {
  env: process.env,
  telemetry,
  http: { configurer: new HttpApplicationSetup() },
});
