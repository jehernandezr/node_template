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

/** Calls a service's internal operations over HTTP, signed with the test environment secret. */
export class InternalOperationsClient {
  private static readonly BUDGET_MS = 20_000;
  private readonly transport: HttpTransport;

  constructor(service: string, baseUrl: string, secret: string) {
    const clock = new SystemClock();
    this.transport = new HttpTransport(
      new ServiceBaseUrls({ [service]: baseUrl }),
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
      // Each call is a new operation: the key does not repeat across clients of the same app.
      idempotencyKey: randomUUID(),
      deadline: Date.now() + InternalOperationsClient.BUDGET_MS,
      timeoutMs: InternalOperationsClient.BUDGET_MS,
      ...(tenantId === undefined ? {} : { tenantId }),
    });
  }
}
