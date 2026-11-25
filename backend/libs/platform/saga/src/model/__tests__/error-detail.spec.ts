import { PlatformError } from '@platform/kernel';
import { ErrorDetail } from '../error-detail.js';

class SoldOutError extends PlatformError {
  override readonly code = 'SHOP.SOLD_OUT';

  constructor() {
    super('out of stock');
  }
}

describe('ErrorDetail', () => {
  it('gives the code and message of a platform error', () => {
    expect(ErrorDetail.of(new SoldOutError())).toBe(
      'SHOP.SOLD_OUT: out of stock',
    );
  });

  it('gives the name and message of any other error', () => {
    expect(ErrorDetail.of(new TypeError('bad type'))).toBe(
      'TypeError: bad type',
    );
  });

  it('describes any other value by its type', () => {
    expect(ErrorDetail.of('loose text')).toBe('thrown string');
  });

  it('truncates a long text to 300 characters with an ellipsis', () => {
    const detail = ErrorDetail.of(new Error('x'.repeat(1000)));

    expect(detail).toHaveLength(ErrorDetail.MAX_LENGTH);
    expect(detail.endsWith('…')).toBe(true);
  });
});
