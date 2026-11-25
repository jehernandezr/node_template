import { OperationInvoker } from '@platform/saga';
import { CallOutcome, isFinalOutcome } from '@platform/primitives';

/**
 * Fake versions of the services a saga calls: each operation responds with success unless the test stores
 * another result for it, and a repeated call with the same key returns the stored final response without a second
 * effect, as a real participant does with its idempotency record, which does not store a transient failure.
 */
export class RecordingParticipants extends OperationInvoker {
  private readonly calls: {
    operationId: string;
    key: string;
    input: unknown;
  }[] = [];
  private readonly answered = new Map<string, CallOutcome<unknown>>();
  private readonly scripted = new Map<string, CallOutcome<unknown>[]>();
  private readonly effects = new Map<string, number>();

  /** The next call to `operationId` responds with `outcome`. */
  answer(operationId: string, outcome: CallOutcome<unknown>): void {
    this.scripted.set(operationId, [
      ...(this.scripted.get(operationId) ?? []),
      outcome,
    ]);
  }

  /** The operations called, in order, including retries. */
  operations(): string[] {
    return this.calls.map((call) => call.operationId);
  }

  inputOf(operationId: string): unknown {
    return this.calls.find((call) => call.operationId === operationId)?.input;
  }

  keysOf(operationId: string): string[] {
    return this.calls
      .filter((call) => call.operationId === operationId)
      .map((call) => call.key);
  }

  /** How many times an operation applied its effect, not counting responses repeated by key. */
  effectsOf(operationId: string): number {
    return this.effects.get(operationId) ?? 0;
  }

  override async invoke(
    operationId: string,
    input: unknown,
    idempotencyKey: string,
  ): Promise<CallOutcome<unknown>> {
    this.calls.push({ operationId, key: idempotencyKey, input });
    const replay = this.answered.get(idempotencyKey);
    if (replay !== undefined) {
      return replay;
    }
    const outcome =
      this.scripted.get(operationId)?.shift() ?? CallOutcome.success({});
    this.effects.set(operationId, this.effectsOf(operationId) + 1);
    if (isFinalOutcome(outcome)) {
      this.answered.set(idempotencyKey, outcome);
    }
    return outcome;
  }
}
