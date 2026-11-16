import './instrumentation.js';
import { telemetry } from './instrumentation.js';
import { ServiceBootstrap } from '@platform/service/nest';
import { identityService } from './identity.service.js';

await ServiceBootstrap.worker(identityService, { env: process.env, telemetry });
