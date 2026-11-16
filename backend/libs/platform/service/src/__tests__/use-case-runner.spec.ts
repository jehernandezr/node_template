import { FixedClock } from '@platform/kernel/test-utils';
import { Redactor, Tracing } from '@platform/observability';
import {
  InMemoryMetrics,
  MeasurementType,
} from '@platform/observability/test-utils';
import { InvalidServiceDefinitionError } from '../errors/invalid-service-definition.error.js';
import { ServiceErrorCode } from '../errors/service-error-code.enum.js';
import { ServiceMetric } from '../service-metric.enum.js';
import { ServiceMetricAttribute } from '../service-metric-attribute.enum.js';
import { UseCaseOutcome } from '../use-case-outcome.enum.js';
import { UseCaseRunner } from '../use-case-runner.js';
import { AdvancingUseCase } from './utils/advancing-use-case.js';
import { CountingTransactionManager } from './utils/counting-transaction-manager.js';
import { EchoUseCase } from './utils/echo-use-case.js';
import { FailingUseCase } from './utils/failing-use-case.js';

describe('UseCaseRunner', () => {
  let metrics: InMemoryMetrics;
  let transactions: CountingTransactionManager;
  let clock: FixedClock;
  let runner: UseCaseRunner;

  beforeEach(() => {
    metrics = new InMemoryMetrics();
    transactions = new CountingTransactionManager();
    clock = new FixedClock();
    runner = new UseCaseRunner(
      new Tracing(new Redactor()),
      metrics,
      transactions,
      clock,
    );
  });

  describe('when the use case succeeds', () => {
    it('returns the output of the use case', async () => {
      await expect(runner.run(new EchoUseCase(), 'hola')).resolves.toBe('hola');
    });

    it('does not open a transaction by default', async () => {
      await runner.run(new EchoUseCase(), 'hola');

      expect(transactions.openedCount).toBe(0);
    });

    it('opens one transaction when the transaction option is true', async () => {
      await runner.run(new EchoUseCase(), 'hola', { transaction: true });

      expect(transactions.openedCount).toBe(1);
    });

    it('records the duration with the success outcome and the class name', async () => {
      await runner.run(new AdvancingUseCase(clock, 250), 'hola');

      expect(metrics.measurements).toContainEqual({
        type: MeasurementType.Histogram,
        name: ServiceMetric.UseCaseDuration,
        value: 250,
        attributes: {
          [ServiceMetricAttribute.UseCase]: 'AdvancingUseCase',
          [ServiceMetricAttribute.Outcome]: UseCaseOutcome.Success,
        },
      });
    });
  });

  describe('when the use case fails', () => {
    it.each<[string, Error, string]>([
      [
        'a platform error',
        new InvalidServiceDefinitionError('identity', 'motivo'),
        ServiceErrorCode.InvalidDefinition,
      ],
      ['a plain error', new TypeError('boom'), 'TypeError'],
    ])(
      'rejects with the same error and counts it by type for %s',
      async (_label, error, errorType) => {
        await expect(
          runner.run(new FailingUseCase(error), 'hola'),
        ).rejects.toBe(error);

        expect(
          metrics.total(ServiceMetric.UseCaseErrors, {
            [ServiceMetricAttribute.UseCase]: 'FailingUseCase',
            [ServiceMetricAttribute.ErrorType]: errorType,
          }),
        ).toBe(1);
      },
    );

    it('records the duration with the error outcome', async () => {
      await expect(
        runner.run(new FailingUseCase(new TypeError('boom')), 'hola'),
      ).rejects.toThrow(TypeError);

      expect(metrics.measurements).toContainEqual(
        expect.objectContaining({
          name: ServiceMetric.UseCaseDuration,
          attributes: {
            [ServiceMetricAttribute.UseCase]: 'FailingUseCase',
            [ServiceMetricAttribute.Outcome]: UseCaseOutcome.Error,
          },
        }),
      );
    });
  });
});
