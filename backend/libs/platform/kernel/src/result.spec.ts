import { err, isErr, isOk, ok, type Result } from './result.js';

function parsePositive(text: string): Result<number, string> {
  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? ok(value) : err('NOT_POSITIVE');
}

describe('Result', () => {
  it('builds an Ok with a value', () => {
    expect(ok(3)).toEqual({ ok: true, value: 3 });
  });

  it('builds an Ok without a value', () => {
    const result = ok();
    expect(result.ok).toBe(true);
    expect(result.value).toBeUndefined();
  });

  it('builds an Err with an error', () => {
    const error = new Error('boom');
    expect(err(error)).toEqual({ ok: false, error });
  });

  it('narrows with the ok discriminant and the guards', () => {
    const good = parsePositive('5');
    const bad = parsePositive('-1');

    expect(isOk(good)).toBe(true);
    expect(isErr(good)).toBe(false);
    expect(isOk(bad)).toBe(false);
    expect(isErr(bad)).toBe(true);

    if (good.ok) {
      expect(good.value + 1).toBe(6);
    }
    if (isErr(bad)) {
      expect(bad.error).toBe('NOT_POSITIVE');
    }
  });
});
