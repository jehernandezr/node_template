import {
  Catch,
  HttpException,
  Injectable,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { LoggerPort, RequestContextStore } from '@platform/observability';
import { HttpProblemError } from '../http-problem.error.js';
import { ProblemDetailsMapper } from '../problem-details-mapper.js';
import type { HttpResponseView } from '../http-response-view.js';
import type { PipelineRequest } from './pipeline-request.js';

/**
 * Responde cada error como Problem Details. Un 404 de Nest sale como `PLATFORM.RESOURCE.NOT_FOUND`;
 * el resto de excepciones HTTP (por ejemplo el 503 de un readiness) salen tal cual.
 */
@Catch()
@Injectable()
export class ProblemDetailsFilter implements ExceptionFilter {
  constructor(
    private readonly mapper: ProblemDetailsMapper,
    private readonly store: RequestContextStore,
    private readonly logger: LoggerPort,
    private readonly adapters: HttpAdapterHost,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<PipelineRequest>();
    const response = http.getResponse<HttpResponseView>();
    const adapter = this.adapters.httpAdapter;
    const traceId = this.store.current()?.traceId;

    if (exception instanceof HttpException && exception.getStatus() !== 404) {
      const status = exception.getStatus();
      this.log(status, exception, request.path);
      adapter.reply(response, exception.getResponse(), status);
      return;
    }
    const error =
      exception instanceof HttpException
        ? HttpProblemError.notFound()
        : exception;
    const problem = this.mapper.map(error, {
      instance: request.path,
      ...(traceId !== undefined && { traceId }),
    });
    this.log(problem.status, exception, request.path);
    for (const [name, value] of Object.entries(problem.headers)) {
      adapter.setHeader(response, name, value);
    }
    adapter.reply(response, problem.body, problem.status);
  }

  private log(status: number, exception: unknown, path: string): void {
    const fields = { status, path };
    if (status === 500) {
      this.logger.error('request failed', {
        ...fields,
        ...(exception instanceof Error && { stack: exception.stack }),
      });
      return;
    }
    if (status > 500) {
      this.logger.warn('request failed', fields);
      return;
    }
    this.logger.debug('request rejected', fields);
  }
}
