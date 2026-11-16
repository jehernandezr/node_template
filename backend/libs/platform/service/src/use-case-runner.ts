import { ErrorDescriptor } from '@platform/kernel';
import type { Clock, TransactionManager, UseCase } from '@platform/kernel';
import type { MetricsPort, Tracing } from '@platform/observability';
import { ServiceMetric } from './service-metric.enum.js';
import { ServiceMetricAttribute } from './service-metric-attribute.enum.js';
import type { UseCaseRunOptions } from './use-case-run-options.js';
import { UseCaseOutcome } from './use-case-outcome.enum.js';

/**
 * Ejecuta casos de uso con span, métricas de latencia y de error y, si se pide, dentro de
 * una transacción. Lo comparten HTTP, consumidores y operaciones internas.
 */
export class UseCaseRunner {
  private static readonly SPAN_PREFIX = 'use-case';

  constructor(
    private readonly tracing: Tracing,
    private readonly metrics: MetricsPort,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
  ) {}

  run<TInput, TOutput>(
    useCase: UseCase<TInput, TOutput>,
    input: TInput,
    options: UseCaseRunOptions = {},
  ): Promise<TOutput> {
    const name = useCase.constructor.name;
    return this.tracing.withSpan(
      `${UseCaseRunner.SPAN_PREFIX} ${name}`,
      async () => {
        const started = this.clock.now().getTime();
        let outcome = UseCaseOutcome.Error;
        try {
          const result =
            options.transaction === true
              ? await this.transactions.runInTransaction(() =>
                  useCase.execute(input),
                )
              : await useCase.execute(input);
          outcome = UseCaseOutcome.Success;
          return result;
        } catch (error) {
          const description = ErrorDescriptor.describe(error);
          this.metrics.increment(ServiceMetric.UseCaseErrors, {
            [ServiceMetricAttribute.UseCase]: name,
            [ServiceMetricAttribute.ErrorType]:
              description.code ?? description.name,
          });
          throw error;
        } finally {
          this.metrics.record(
            ServiceMetric.UseCaseDuration,
            this.clock.now().getTime() - started,
            {
              [ServiceMetricAttribute.UseCase]: name,
              [ServiceMetricAttribute.Outcome]: outcome,
            },
          );
        }
      },
    );
  }
}
