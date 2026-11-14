import { FixedRandomSource } from './utils/fixed-random-source.js';

describe('FixedRandomSource', () => {
  it('cycles through the given values', () => {
    const random = new FixedRandomSource([0.1, 0.9]);
    expect([random.next(), random.next(), random.next()]).toEqual([
      0.1, 0.9, 0.1,
    ]);
  });

  it('defaults to 0.5', () => {
    expect(new FixedRandomSource().next()).toBe(0.5);
  });

  it('fills bytes with the given value', () => {
    expect(Array.from(new FixedRandomSource([0.5], 7).bytes(3))).toEqual([
      7, 7, 7,
    ]);
  });
});
