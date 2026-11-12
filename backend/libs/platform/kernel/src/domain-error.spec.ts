import { DomainError } from './domain-error.js';
import { PlatformError } from './platform-error.js';

class NotEnoughStockError extends DomainError {
  override readonly code = 'SALES.STOCK.NOT_ENOUGH';
}

class VersionConflictError extends DomainError {
  override readonly code = 'SALES.ORDER.VERSION_CONFLICT';

  constructor(cause: unknown) {
    super('Version conflict', undefined, { cause, retryable: true });
  }
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

  it('is a PlatformError that is not retryable by default and has no cause', () => {
    const error = new NotEnoughStockError('x');
    expect(error).toBeInstanceOf(PlatformError);
    expect(error.retryable).toBe(false);
    expect(error.cause).toBeUndefined();
    expect('cause' in error).toBe(false);
  });

  it('accepts a native cause and a retryable flag', () => {
    const cause = new Error('row changed');
    const error = new VersionConflictError(cause);
    expect(error.cause).toBe(cause);
    expect(error.retryable).toBe(true);
    expect(error.details).toBeUndefined();
  });
});
