import type { ExecutionContext, Type } from '@nestjs/common';

type HttpArguments = ReturnType<ExecutionContext['switchToHttp']>;
type RpcArguments = ReturnType<ExecutionContext['switchToRpc']>;
type WsArguments = ReturnType<ExecutionContext['switchToWs']>;

/** Minimal HTTP request for the test context. */
export interface FakeRequest {
  readonly ip?: string;
}

/** Function that acts as the handler of a route, in the tests. */
export type FakeHandler = (...args: unknown[]) => unknown;

/** HTTP execution context with a fixed controller, handler and request. */
export class FakeHttpExecutionContext implements ExecutionContext {
  constructor(
    private readonly request: FakeRequest,
    private readonly controller: Type<unknown>,
    private readonly handler: FakeHandler,
  ) {}

  getClass<T = unknown>(): Type<T> {
    return this.controller as Type<T>;
  }

  getHandler(): FakeHandler {
    return this.handler;
  }

  getArgs<T extends unknown[] = unknown[]>(): T {
    return [this.request] as T;
  }

  getArgByIndex<T = unknown>(index: number): T {
    return (index === 0 ? this.request : undefined) as T;
  }

  switchToHttp(): HttpArguments {
    return new FakeHttpArguments(this.request);
  }

  switchToRpc(): RpcArguments {
    throw new Error('RPC is not used in these tests');
  }

  switchToWs(): WsArguments {
    throw new Error('WS is not used in these tests');
  }

  getType<TContext extends string = 'http'>(): TContext {
    return 'http' as TContext;
  }
}

/** HTTP arguments of the test. */
class FakeHttpArguments implements HttpArguments {
  constructor(private readonly request: FakeRequest) {}

  getRequest<T = FakeRequest>(): T {
    return this.request as T;
  }

  getResponse<T = unknown>(): T {
    return undefined as T;
  }

  getNext<T = unknown>(): T {
    return undefined as T;
  }
}
