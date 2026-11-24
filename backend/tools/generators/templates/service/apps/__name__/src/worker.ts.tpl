import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { ServiceBootstrap } from '@platform/service/nest';
import { __nameCamel__Service } from './__name__.service.js';

await ServiceBootstrap.worker(__nameCamel__Service, { env: process.env, telemetry });
