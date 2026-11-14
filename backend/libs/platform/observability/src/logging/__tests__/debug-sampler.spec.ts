import { FixedRandomSource } from '@platform/kernel/test-utils';
import { DebugSampler } from '../debug-sampler.js';

describe('DebugSampler', () => {
  it.each([
    [0, 0, false],
    [-1, 0, false],
    [1, 0.999, true],
    [2, 0.999, true],
    [0.5, 0.49, true],
    [0.5, 0.5, false],
    [0.5, 0.9, false],
  ])('with rate %p and random %p samples %p', (rate, random, expected) => {
    const sampler = new DebugSampler(rate, new FixedRandomSource([random]));

    expect(sampler.shouldSample()).toBe(expected);
  });
});
