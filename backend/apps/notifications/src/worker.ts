import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { ServiceBootstrap } from '@platform/service/nest';
import { notificationsService } from './notifications.service.js';

await ServiceBootstrap.worker(notificationsService, {
  env: process.env,
  telemetry,
});
