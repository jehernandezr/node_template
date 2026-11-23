import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { ServiceBootstrap } from '@platform/service/nest';
import { tasksService } from './tasks.service.js';

await ServiceBootstrap.worker(tasksService, { env: process.env, telemetry });
