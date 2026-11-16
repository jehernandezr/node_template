import { type Clock, SystemClock, ClaimRequest } from '@platform/kernel';
import { InMemoryProcessedMessageStore } from '../../../__tests__/utils/in-memory-processed-message-store.js';
import { StoreOperation } from './store-operation.enum.js';

/**
 * Almacén que lanza `error` en la operación indicada, las veces indicadas. Las
 * demás operaciones se comportan como el almacén en memoria.
 */
export class FailingProcessedMessageStore extends InMemoryProcessedMessageStore {
  private remaining: number;

  constructor(
    private readonly operation: StoreOperation,
    private readonly error: Error,
    times: number = Number.POSITIVE_INFINITY,
    clock: Clock = new SystemClock(),
  ) {
    super(clock);
    this.remaining = times;
  }

  override claim(
    key: string,
    request: ClaimRequest,
  ): ReturnType<InMemoryProcessedMessageStore['claim']> {
    return this.failIf(StoreOperation.Claim)
      ? Promise.reject(this.error)
      : super.claim(key, request);
  }

  override complete(
    key: string,
    claimToken: string,
    result: Parameters<InMemoryProcessedMessageStore['complete']>[2],
  ): ReturnType<InMemoryProcessedMessageStore['complete']> {
    return this.failIf(StoreOperation.Complete)
      ? Promise.reject(this.error)
      : super.complete(key, claimToken, result);
  }

  override release(
    key: string,
    claimToken: string,
  ): ReturnType<InMemoryProcessedMessageStore['release']> {
    return this.failIf(StoreOperation.Release)
      ? Promise.reject(this.error)
      : super.release(key, claimToken);
  }

  private failIf(operation: StoreOperation): boolean {
    if (operation !== this.operation || this.remaining <= 0) return false;
    this.remaining -= 1;
    return true;
  }
}
