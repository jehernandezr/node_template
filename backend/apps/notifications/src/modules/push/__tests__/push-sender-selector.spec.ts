import { PushSenderKind } from '../../../shared/enums/push-sender-kind.enum.js';
import { InMemoryPushSender } from '../infrastructure/in-memory-push-sender.js';
import { NonePushSender } from '../infrastructure/none-push-sender.js';
import { PushSenderSelector } from '../infrastructure/push-sender-selector.js';

describe('PushSenderSelector', () => {
  it.each([
    [PushSenderKind.Memory, InMemoryPushSender],
    [PushSenderKind.None, NonePushSender],
  ])('builds the %s sender', (kind, sender) => {
    expect(
      new PushSenderSelector().select({ NOTIFICATIONS_PUSH_SENDER: kind }),
    ).toBeInstanceOf(sender);
  });
});
