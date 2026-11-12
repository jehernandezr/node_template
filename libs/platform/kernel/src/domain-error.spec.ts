import { DomainError } from './domain-error.js';

class NotEnoughStockError extends DomainError {
  override readonly code = 'SALES.STOCK.NOT_ENOUGH';
}

describe('DomainError', () => {
  it('sets name to the subclass name and keeps code, message and details', () => {
    const error = new NotEnoughStockError('Sin stock', { sku: 'A1' });
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DomainError);
    expect(error.name).toBe('NotEnoughStockError');
    expect(error.code).toBe('SALES.STOCK.NOT_ENOUGH');
    expect(error.message).toBe('Sin stock');
    expect(error.details).toEqual({ sku: 'A1' });
  });

  it('leaves details undefined when omitted', () => {
    expect(new NotEnoughStockError('x').details).toBeUndefined();
  });
});
