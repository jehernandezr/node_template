import { SystemClock, SystemRandomSource } from '@platform/kernel';
import { MessageDispatcher, type TenantVerifier } from '@platform/messaging';
import {
  InMemoryProcessedMessageStore,
  TestDispatcherParts,
} from '@platform/messaging/test-utils';

/** The real dispatcher of a notifications consumer queue, with its idempotency store in memory. */
export class ConsumerDispatcher {
  /** Builds the dispatcher of the `notifications` consumer, verifying each envelope tenant with `verifier`. */
  static create(verifier: TenantVerifier): MessageDispatcher {
    return new MessageDispatcher(
      {
        clock: new SystemClock(),
        consumer: 'notifications',
        processed: new InMemoryProcessedMessageStore(),
        verifyTenant: verifier,
      },
      TestDispatcherParts.with(new SystemRandomSource()),
    );
  }
}
