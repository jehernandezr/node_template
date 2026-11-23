import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { ServiceBootstrap } from '@platform/service/nest';
import { reportsService } from './reports.service.js';

await ServiceBootstrap.worker(reportsService, { env: process.env, telemetry });
