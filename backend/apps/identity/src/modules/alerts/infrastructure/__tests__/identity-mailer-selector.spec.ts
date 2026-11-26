import { IdentityMailerKind } from '../../../../config/identity-mailer-kind.enum.js';
import { IdentityMailerSelector } from '../identity-mailer-selector.js';
import { MemoryIdentityMailer } from '../memory-identity-mailer.js';

class SelectorFixture {
  readonly memory = new MemoryIdentityMailer();
  readonly console = new MemoryIdentityMailer();
  readonly notifications = new MemoryIdentityMailer();
  readonly selector = new IdentityMailerSelector(
    this.memory,
    this.console,
    this.notifications,
  );
}

describe('IdentityMailerSelector', () => {
  it.each([
    [IdentityMailerKind.Memory, 'memory'],
    [IdentityMailerKind.Console, 'console'],
    [IdentityMailerKind.Notifications, 'notifications'],
  ] as const)('picks the %s mailer', (kind, slot) => {
    const fixture = new SelectorFixture();

    expect(fixture.selector.select(kind)).toBe(fixture[slot]);
  });
});
