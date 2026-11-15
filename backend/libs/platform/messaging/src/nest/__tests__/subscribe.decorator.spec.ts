import { Subscribe } from '../subscribe.decorator.js';
import { SubscribeMetadata } from '../subscribe-metadata.js';
import { UserRegisteredV1 } from './utils/index.js';

class DecoratedConsumer {
  @Subscribe(UserRegisteredV1)
  handle(): void {
    // Solo importa el decorador.
  }

  plain(): void {
    // Sin decorador a propósito.
  }
}

describe('Subscribe', () => {
  it('stores the contract on the decorated method', () => {
    expect(
      SubscribeMetadata.contractOf(DecoratedConsumer.prototype.handle),
    ).toBe(UserRegisteredV1);
  });

  it.each([
    ['an undecorated method', DecoratedConsumer.prototype.plain],
    ['a value that is not a function', 'user-registered'],
    ['an undefined value', undefined],
  ])('returns undefined for %s', (_label, value) => {
    expect(SubscribeMetadata.contractOf(value)).toBeUndefined();
  });
});
