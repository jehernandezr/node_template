import './instrumentation.js';
import { NestFactory } from '@nestjs/core';
import { telemetry } from './instrumentation.js';
import { SmokeAppModule } from './smoke-app.module.js';

const app = await NestFactory.create(
  SmokeAppModule.register({ env: process.env, telemetry }),
);
app.enableShutdownHooks();
await app.listen(Number(process.env['PORT'] ?? 3000));
