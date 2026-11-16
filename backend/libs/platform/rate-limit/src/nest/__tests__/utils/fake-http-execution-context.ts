import type { ExecutionContext, Type } from '@nestjs/common';

type HttpArguments = ReturnType<ExecutionContext['switchToHttp']>;
type RpcArguments = ReturnType<ExecutionContext['switchToRpc']>;
type WsArguments = ReturnType<ExecutionContext['switchToWs']>;

/** Petición HTTP mínima para el contexto de prueba. */
export interface FakeRequest {
  readonly ip?: string;
}

/** Función que hace de manejador de una ruta, en las pruebas. */
export type FakeHandler = (...args: unknown[]) => unknown;

/** Contexto de ejecución HTTP con un controlador, un manejador y una petición fijos. */
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

/** Argumentos HTTP de la prueba. */
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
