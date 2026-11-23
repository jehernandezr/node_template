import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { UsageMetric } from '@contracts/billing';
import { ActorGuards } from '@platform/auth';
import { HttpRequestKey, type PipelineRequest } from '@platform/http/nest';
import { LoggerPort } from '@platform/observability';
import { from, switchMap, type Observable } from 'rxjs';
import { UsageRecorder } from '../usage-recorder.js';

/**
 * Cuenta una llamada de API por cada petición de una service account. Un contador que no responde no tumba
 * la petición: se pierde esa llamada en la medición y queda en el log.
 */
@Injectable()
export class ApiCallMeteringInterceptor implements NestInterceptor {
  constructor(
    private readonly recorder: UsageRecorder,
    private readonly logger: LoggerPort,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const actor = context.switchToHttp().getRequest<PipelineRequest>()[
      HttpRequestKey.Call
    ]?.actor;
    if (actor === undefined || !ActorGuards.isServiceAccount(actor)) {
      return next.handle();
    }
    return from(this.count(actor.tenantId)).pipe(
      switchMap(() => next.handle()),
    );
  }

  private async count(tenantId: string): Promise<void> {
    try {
      await this.recorder.record(tenantId, UsageMetric.ApiCalls);
    } catch (error) {
      this.logger.warn('api call not metered', { tenantId, error });
    }
  }
}
