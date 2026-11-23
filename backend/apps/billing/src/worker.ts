import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { ServiceBootstrap } from '@platform/service/nest';
import { billingService } from './billing.service.js';

await ServiceBootstrap.worker(billingService, { env: process.env, telemetry });
