import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { AwsInstrumentation } from '@opentelemetry/instrumentation-aws-sdk';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { IovalkeyInstrumentation } from '../iovalkey-instrumentation.js';
import { InstrumentationFactory } from '../instrumentation-factory.js';
import { TelemetryInstrumentation } from '../telemetry-instrumentation.enum.js';

const EXPECTED_CLASSES = [
  [TelemetryInstrumentation.Http, HttpInstrumentation],
  [TelemetryInstrumentation.Fetch, UndiciInstrumentation],
  [TelemetryInstrumentation.Pg, PgInstrumentation],
  [TelemetryInstrumentation.Valkey, IovalkeyInstrumentation],
  [TelemetryInstrumentation.AwsSdk, AwsInstrumentation],
  [TelemetryInstrumentation.NestJs, NestInstrumentation],
] as const;

describe('InstrumentationFactory', () => {
  it.each(EXPECTED_CLASSES)(
    'creates the instrumentation of %s',
    (kind, expectedClass) => {
      expect(new InstrumentationFactory().create(kind)).toBeInstanceOf(
        expectedClass,
      );
    },
  );

  it('serializes Valkey statements to the command name only', () => {
    const instrumentation = new InstrumentationFactory().create(
      TelemetryInstrumentation.Valkey,
    ) as IovalkeyInstrumentation;

    expect(
      instrumentation
        .getConfig()
        .dbStatementSerializer?.('get', ['identity:secret-key']),
    ).toBe('get');
  });

  it('covers every TelemetryInstrumentation value', () => {
    expect(EXPECTED_CLASSES.map(([kind]) => kind)).toEqual(
      Object.values(TelemetryInstrumentation),
    );
  });
});
