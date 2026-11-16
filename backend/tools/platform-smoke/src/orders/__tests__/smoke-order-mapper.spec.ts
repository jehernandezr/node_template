import { SmokeOrder } from '../smoke-order.js';
import { SmokeOrderMapper } from '../smoke-order.mapper.js';
import { SmokeOrderStatus } from '../smoke-order-status.enum.js';

describe('SmokeOrderMapper', () => {
  const mapper = new SmokeOrderMapper();

  it('leaves the version out of an order that is not stored yet', () => {
    const entity = mapper.toPersistence(
      new SmokeOrder('o-1', 'Ana', SmokeOrderStatus.Placed, 0),
    );

    expect(entity.version).toBeUndefined();
    expect(entity.customer).toBe('Ana');
  });

  it('keeps the version of a stored order and maps it back', () => {
    const entity = mapper.toPersistence(
      new SmokeOrder('o-1', 'Ana', SmokeOrderStatus.Paid, 3),
    );

    expect(entity.version).toBe(3);
    expect(mapper.toDomain(entity)).toEqual(
      new SmokeOrder('o-1', 'Ana', SmokeOrderStatus.Paid, 3),
    );
  });
});
