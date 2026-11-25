import { SystemClock } from '../../time/system-clock.js';
import { SystemRandomSource } from '../../random/system-random-source.js';
import { FixedClock } from '../../__tests__/utils/fixed-clock.js';
import { UuidV7IdGenerator } from '../uuid-v7-id-generator.js';

describe('UuidV7IdGenerator', () => {
  it('generates distinct UUIDv7 ids', () => {
    const gen = new UuidV7IdGenerator(
      new SystemClock(),
      new SystemRandomSource(),
    );
    const a = gen.next();
    const b = gen.next();
    expect(a.toString()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(a.equals(b)).toBe(false);
  });

  it('encodes the clock in the first 48 bits', () => {
    const at = new Date(Date.UTC(2026, 10, 14, 12, 30, 45, 123));
    const id = new UuidV7IdGenerator(
      new FixedClock(at),
      new SystemRandomSource(),
    ).next();
    expect(id.timestamp().getTime()).toBe(at.getTime());
  });

  it('keeps ids ordered within the same millisecond', () => {
    const gen = new UuidV7IdGenerator(
      new FixedClock(new Date(1_700_000_000_000)),
      new SystemRandomSource(),
    );
    const ids = Array.from({ length: 5000 }, () => gen.next().toString());
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never goes back when the clock does', () => {
    const clock = new FixedClock(new Date(1_700_000_000_500));
    const gen = new UuidV7IdGenerator(clock, new SystemRandomSource());
    const first = gen.next();
    clock.advance(-400);
    const second = gen.next();
    expect(second.toString() > first.toString()).toBe(true);
    expect(second.timestamp().getTime()).toBe(1_700_000_000_500);
  });
});
