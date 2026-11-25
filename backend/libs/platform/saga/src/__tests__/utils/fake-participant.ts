import { CallOutcome } from '@platform/primitives';
import { OperationInvoker } from '../../invoker/operation-invoker.js';
import type { InvokeOptions } from '../../invoker/invoke-options.js';
import type { SagaCallContext } from '../../model/saga-call-context.js';

/** A call received by the fake participant. */
export interface RecordedCall {
  readonly operationId: string;
  readonly idempotencyKey: string;
  readonly input: unknown;
  readonly context: SagaCallContext | undefined;
}

/** What the participant is built with. Everything is optional. */
export interface FakeParticipantOptions {
  /** Fixed date of the outputs, so the tests compare exact values. */
  readonly createdAt?: Date;
}

/**
 * Fake participant. Create operations create a resource and delete
 * operations remove it. A success is stored by idempotency key, so a
 * repeated call returns the stored result without a second effect. Create
 * results carry a date to exercise output normalization.
 */
export class FakeParticipant extends OperationInvoker {
  readonly calls: RecordedCall[] = [];
  /** How many times the effect of each create operation was applied. */
  readonly effects = new Map<string, number>();
  private readonly live = new Set<string>();
  private readonly results = new Map<string, CallOutcome<unknown>>();
  private readonly scripted = new Map<
    string,
    (CallOutcome<unknown> | Error)[]
  >();
  private readonly createdAt: Date;
  private sequence = 0;

  constructor(options: FakeParticipantOptions = {}) {
    super();
    this.createdAt = options.createdAt ?? new Date(0);
  }

  /** Queues results for the next calls of `operationId`. An `Error` is thrown. */
  script(
    operationId: string,
    ...outcomes: (CallOutcome<unknown> | Error)[]
  ): void {
    this.scripted.set(operationId, [
      ...(this.scripted.get(operationId) ?? []),
      ...outcomes,
    ]);
  }

  get liveResources(): number {
    return this.live.size;
  }

  operations(): string[] {
    return this.calls.map((call) => call.operationId);
  }

  removes(): string[] {
    return this.operations().filter((operationId) =>
      operationId.includes('.remove.'),
    );
  }

  /** Idempotency keys `operationId` was called with, in order of arrival. */
  keysOf(operationId: string): string[] {
    return this.calls
      .filter((call) => call.operationId === operationId)
      .map((call) => call.idempotencyKey);
  }

  /** Calls received with this idempotency key. */
  callsWithKey(key: string): RecordedCall[] {
    return this.calls.filter((call) => call.idempotencyKey === key);
  }

  override async invoke(
    operationId: string,
    input: unknown,
    idempotencyKey: string,
    options?: InvokeOptions,
  ): Promise<CallOutcome<unknown>> {
    this.calls.push({
      operationId,
      idempotencyKey,
      input,
      context: options?.context,
    });
    const replay = this.results.get(idempotencyKey);
    if (replay !== undefined) {
      return replay;
    }
    const scripted = this.scripted.get(operationId)?.shift();
    if (scripted instanceof Error) {
      throw scripted;
    }
    if (scripted !== undefined) {
      return scripted;
    }
    const [name, verb] = operationId.split('.');
    if (verb === 'remove') {
      this.live.delete((input as { id?: string }).id ?? '');
      const result = FakeParticipant.ok();
      this.results.set(idempotencyKey, result);
      return result;
    }
    this.sequence += 1;
    const id = `${name}-${this.sequence}`;
    this.live.add(id);
    this.effects.set(operationId, (this.effects.get(operationId) ?? 0) + 1);
    const result = FakeParticipant.ok({ id, at: this.createdAt });
    this.results.set(idempotencyKey, result);
    return result;
  }

  private static ok(output: unknown = {}): CallOutcome<unknown> {
    return CallOutcome.success(output);
  }
}
