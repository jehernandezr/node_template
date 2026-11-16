import { PlatformError } from '@platform/kernel';
import { ErrorDetail } from '../error-detail.js';

class SoldOutError extends PlatformError {
  override readonly code = 'SHOP.SOLD_OUT';

  constructor() {
    super('no hay stock');
  }
}

describe('ErrorDetail', () => {
  it('da el código y el mensaje de un error de plataforma', () => {
    expect(ErrorDetail.of(new SoldOutError())).toBe(
      'SHOP.SOLD_OUT: no hay stock',
    );
  });

  it('da el nombre y el mensaje de cualquier otro error', () => {
    expect(ErrorDetail.of(new TypeError('mal tipo'))).toBe(
      'TypeError: mal tipo',
    );
  });

  it('describe cualquier otro valor por su tipo', () => {
    expect(ErrorDetail.of('texto suelto')).toBe('thrown string');
  });

  it('trunca un texto largo a 300 caracteres con puntos suspensivos', () => {
    const detail = ErrorDetail.of(new Error('x'.repeat(1000)));

    expect(detail).toHaveLength(ErrorDetail.MAX_LENGTH);
    expect(detail.endsWith('…')).toBe(true);
  });
});
