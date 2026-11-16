import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContextStore } from '../context/request-context-store.js';
import { DebugSampler } from '../logging/debug-sampler.js';
import { TraceContextCodec } from '../propagation/trace-context-codec.js';

/**
 * Garantiza un `RequestContext` en handlers que no pasan por el middleware
 * (mensajes, RPC, jobs). Si ya hay uno vigente lo deja intacto; si no, abre uno
 * nuevo con `traceId` propio y la muestra de debug, y corre el handler dentro.
 */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(
    private readonly store: RequestContextStore,
    private readonly codec: TraceContextCodec,
    private readonly sampler: DebugSampler,
  ) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    if (this.store.current() !== undefined) {
      return next.handle();
    }
    return new Observable((subscriber) =>
      this.store.run(
        {
          traceId: this.codec.newTraceId(),
          debugSampled: this.sampler.shouldSample(),
        },
        () => next.handle().subscribe(subscriber),
      ),
    );
  }
}
