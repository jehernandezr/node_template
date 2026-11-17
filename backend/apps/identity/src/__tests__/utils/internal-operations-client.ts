import { randomUUID } from 'node:crypto';
import type { OperationDefinition } from '@contracts/platform';
import {
  HmacSigner,
  HttpOutcomeReader,
  HttpTransport,
  ServiceBaseUrls,
} from '@platform/internal-api';
import { SystemClock } from '@platform/kernel';
import { RetryAfterParser, type CallOutcome } from '@platform/primitives';

/** Llama las operaciones internas de identity por HTTP, firmadas con el secreto del entorno de prueba. */
export class InternalOperationsClient {
  private static readonly BUDGET_MS = 20_000;
  private readonly transport: HttpTransport;

  constructor(baseUrl: string, secret: string) {
    const clock = new SystemClock();
    this.transport = new HttpTransport(
      new ServiceBaseUrls({ identity: baseUrl }),
      new HmacSigner(secret, clock),
      new HttpOutcomeReader(new RetryAfterParser(clock)),
      globalThis.fetch,
    );
  }

  invoke(
    operation: OperationDefinition,
    input: unknown,
    tenantId?: string,
  ): Promise<CallOutcome<unknown>> {
    return this.transport.invoke(operation.id, input, {
      // Cada llamada es una operación nueva: la llave no se repite entre clientes de la misma app.
      idempotencyKey: randomUUID(),
      deadline: Date.now() + InternalOperationsClient.BUDGET_MS,
      timeoutMs: InternalOperationsClient.BUDGET_MS,
      ...(tenantId === undefined ? {} : { tenantId }),
    });
  }
}
