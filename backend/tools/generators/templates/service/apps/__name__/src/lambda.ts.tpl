import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { HttpApplicationSetup } from '@platform/http/nest';
import { LambdaBootstrap } from '@platform/service/nest';
import { __nameCamel__Service } from './__name__.service.js';

/** API de __name__ en Lambda: `api.runtime = "lambda"` en los tfvars del servicio usa este handler. */
export const handler = LambdaBootstrap.http(__nameCamel__Service, {
  env: process.env,
  telemetry,
  http: { configurer: new HttpApplicationSetup() },
});
