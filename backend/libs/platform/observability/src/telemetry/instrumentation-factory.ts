import type { Instrumentation } from '@opentelemetry/instrumentation';
import { AwsInstrumentation } from '@opentelemetry/instrumentation-aws-sdk';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { IovalkeyInstrumentation } from './iovalkey-instrumentation.js';
import { TelemetryInstrumentation } from './telemetry-instrumentation.enum.js';

/** Crea la instrumentación automática de cada `TelemetryInstrumentation`. */
export class InstrumentationFactory {
  create(kind: TelemetryInstrumentation): Instrumentation {
    switch (kind) {
      case TelemetryInstrumentation.Http:
        return new HttpInstrumentation();
      case TelemetryInstrumentation.Fetch:
        return new UndiciInstrumentation();
      case TelemetryInstrumentation.Pg:
        // Sin valores de los parámetros en los spans.
        return new PgInstrumentation({ enhancedDatabaseReporting: false });
      case TelemetryInstrumentation.Valkey:
        // Solo el nombre del comando: las llaves y valores pueden llevar datos.
        return new IovalkeyInstrumentation({
          dbStatementSerializer: (command) => command,
        });
      case TelemetryInstrumentation.AwsSdk:
        return new AwsInstrumentation({
          suppressInternalInstrumentation: true,
        });
      case TelemetryInstrumentation.NestJs:
        return new NestInstrumentation();
    }
  }
}
