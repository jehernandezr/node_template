import type { ClaimRequest, ClaimResult } from '@platform/kernel';
import type {
  ProcessedMessage,
  ProcessedMessageStore,
} from '@platform/messaging';
import type { ClaimTable } from './claim-table.js';

/**
 * TypeORM adapter of the `ProcessedMessageStore` port of `@platform/messaging` on `processed_messages`. It has the
 * same semantics as `InMemoryProcessedMessageStore`: owned claims (token and lease), `in-progress` while another
 * handler runs, `complete` and `release` only with the current token. Inside an open transaction `complete` is
 * saved together with the effects. The logic lives in `ClaimTable`, which is injected already built with `ProcessedMessageEntity`.
 */
export class TypeOrmProcessedMessageStore implements ProcessedMessageStore {
  constructor(private readonly table: ClaimTable<ProcessedMessage>) {}

  claim(
    key: string,
    request: ClaimRequest,
  ): Promise<ClaimResult<ProcessedMessage>> {
    return this.table.claim(key, request);
  }

  complete(
    key: string,
    claimToken: string,
    result: ProcessedMessage,
  ): Promise<void> {
    return this.table.complete(key, claimToken, result);
  }

  release(key: string, claimToken: string): Promise<void> {
    return this.table.release(key, claimToken);
  }

  purgeCompleted(before: Date): Promise<number> {
    return this.table.purgeCompleted(before);
  }
}
