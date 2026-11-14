import { withFallback } from './fallback.js';

describe('withFallback', () => {
  it('returns the operation result when it succeeds', async () => {
    const fallback = jest.fn(() => 'fallback');

    await expect(withFallback(async () => 'primary', fallback)).resolves.toBe(
      'primary',
    );
    expect(fallback).not.toHaveBeenCalled();
  });

  it('returns the fallback value and passes the error when the operation fails', async () => {
    const failure = new Error('down');
    const fallback = jest.fn((error: unknown) =>
      error === failure ? 'cached' : 'unexpected',
    );

    await expect(
      withFallback(async (): Promise<string> => {
        throw failure;
      }, fallback),
    ).resolves.toBe('cached');
    expect(fallback).toHaveBeenCalledWith(failure);
  });

  it('accepts an async fallback', async () => {
    await expect(
      withFallback(
        async (): Promise<number> => {
          throw new Error('down');
        },
        async () => 0,
      ),
    ).resolves.toBe(0);
  });
});
