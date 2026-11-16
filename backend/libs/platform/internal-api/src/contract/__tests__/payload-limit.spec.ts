import { PayloadLimit } from '../payload-limit.js';

describe('PayloadLimit', () => {
  it('measures the UTF-8 bytes of the JSON text', () => {
    expect(PayloadLimit.byteLength({ a: 'ñ' })).toBe('{"a":"ñ"}'.length + 1);
    expect(PayloadLimit.byteLength(undefined)).toBe(0);
    expect(PayloadLimit.byteLength({ big: BigInt(1) })).toBeUndefined();
  });

  it('accepts a payload up to the limit', () => {
    expect(new PayloadLimit(7).fits({ a: 1 })).toBe(true);
    expect(new PayloadLimit(6).fits({ a: 1 })).toBe(false);
  });

  it('rejects a value that cannot be serialized', () => {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;

    expect(new PayloadLimit(1_000).fits(cycle)).toBe(false);
  });

  it('defaults to 256 KiB', () => {
    expect(new PayloadLimit().maxBytes).toBe(256 * 1024);
  });
});
