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
 * Guarantees a `RequestContext` in handlers that do not go through the middleware
 * (messages, RPC, jobs). If one is already current it leaves it intact; otherwise it opens a
 * new one with its own `traceId` and the debug sample, and runs the handler inside it.
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
