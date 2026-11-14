import { Id } from '../id.js';
import * as kernel from '../index.js';
import { FixedClock } from './fixed-clock.js';
import * as testing from './index.js';
import { SequentialIdGenerator } from './sequential-id-generator.js';

describe('testing entry point', () => {
  it('exports the helpers only from @platform/kernel/testing', () => {
    expect(testing.FixedClock).toBe(FixedClock);
    expect(testing.SequentialIdGenerator).toBe(SequentialIdGenerator);
    expect('FixedClock' in kernel).toBe(false);
    expect('SequentialIdGenerator' in kernel).toBe(false);
  });
});

describe('FixedClock', () => {
  it('returns a fixed time, advances it, and sets it', () => {
    const clock = new FixedClock(new Date('2025-01-01T00:00:00.000Z'));
    expect(clock.now().toISOString()).toBe('2025-01-01T00:00:00.000Z');

    clock.advance(1500);
    expect(clock.now().toISOString()).toBe('2025-01-01T00:00:01.500Z');

    clock.set(new Date('2030-05-05T00:00:00.000Z'));
    expect(clock.now().toISOString()).toBe('2030-05-05T00:00:00.000Z');
  });

  it('returns copies so callers cannot mutate the clock', () => {
    const clock = new FixedClock();
    clock.now().setUTCFullYear(1999);
    expect(clock.now().toISOString()).toBe('2025-01-01T00:00:00.000Z');
  });
});

describe('SequentialIdGenerator', () => {
  it('produces distinct, valid UUIDv7 ids in order', () => {
    const gen = new SequentialIdGenerator(new Date('2025-01-01T00:00:00.000Z'));
    const ids = [gen.next(), gen.next(), gen.next()];

    expect(new Set(ids.map(String)).size).toBe(3);
    for (const id of ids) {
      expect(Id.from(id.toString()).equals(id)).toBe(true);
    }
    expect(ids[0]?.toString()).toBe('01941f29-7c00-7000-8000-000000000001');
    expect(ids[2]?.toString()).toBe('01941f29-7c00-7000-8000-000000000003');
  });

  it('encodes the given time in the id timestamp', () => {
    const at = new Date('2025-01-01T00:00:00.000Z');
    const id = new SequentialIdGenerator(at).next();
    expect(id.timestamp().getTime()).toBe(at.getTime());
  });
});
