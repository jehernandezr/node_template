import {
  backoffDelay,
  BackoffStrategy,
  createBackoff,
  MAX_BACKOFF_ATTEMPT,
  validateBackoffOptions,
  type BackoffOptions,
} from './backoff.js';
import { InvalidArgumentError, PrimitivesErrorCode } from './errors.js';

const base = { baseMs: 100, maxMs: 1_000 } as const;

describe('backoffDelay', () => {
  describe('none', () => {
    const options: BackoffOptions = { ...base, strategy: BackoffStrategy.None };

    it('grows exponentially from baseMs and stops at maxMs', () => {
      expect([1, 2, 3, 4, 5, 6].map((n) => backoffDelay(n, options))).toEqual([
        100, 200, 400, 800, 1_000, 1_000,
      ]);
    });

    it('never calls the random source', () => {
      const random = jest.fn(() => 0.5);
      backoffDelay(3, { ...options, random });
      expect(random).not.toHaveBeenCalled();
    });

    it('honours a custom factor', () => {
      const tripled = { ...options, factor: 3, maxMs: 10_000 };
      expect([1, 2, 3].map((n) => backoffDelay(n, tripled))).toEqual([
        100, 300, 900,
      ]);
    });

    it('stays at maxMs for the largest attempt without overflowing', () => {
      expect(backoffDelay(MAX_BACKOFF_ATTEMPT, options)).toBe(1_000);
    });

    it('returns 0 when baseMs is 0, even for huge attempts', () => {
      expect(backoffDelay(MAX_BACKOFF_ATTEMPT, { ...options, baseMs: 0 })).toBe(
        0,
      );
    });
  });

  describe('full jitter', () => {
    const options = (random: () => number): BackoffOptions => ({
      ...base,
      strategy: BackoffStrategy.FullJitter,
      random,
    });

    it('scales the ceiling by the random value', () => {
      expect(
        backoffDelay(
          1,
          options(() => 0),
        ),
      ).toBe(0);
      expect(
        backoffDelay(
          1,
          options(() => 0.5),
        ),
      ).toBe(50);
      expect(
        backoffDelay(
          3,
          options(() => 0.25),
        ),
      ).toBe(100);
      expect(
        backoffDelay(
          10,
          options(() => 0.5),
        ),
      ).toBe(500);
    });

    it('stays below the ceiling when random is close to 1', () => {
      expect(
        backoffDelay(
          10,
          options(() => 0.999_999),
        ),
      ).toBe(999);
    });

    it('clamps a misbehaving random source to [0, 1)', () => {
      expect(
        backoffDelay(
          10,
          options(() => 7),
        ),
      ).toBe(999);
      expect(
        backoffDelay(
          10,
          options(() => -3),
        ),
      ).toBe(0);
      expect(
        backoffDelay(
          10,
          options(() => Number.NaN),
        ),
      ).toBe(0);
    });

    it('stays within [0, ceiling] with the default random source', () => {
      const real: BackoffOptions = {
        ...base,
        strategy: BackoffStrategy.FullJitter,
      };
      for (let i = 0; i < 200; i += 1) {
        const delay = backoffDelay(3, real);
        expect(delay).toBeGreaterThanOrEqual(0);
        expect(delay).toBeLessThan(400);
      }
    });
  });

  describe('equal jitter', () => {
    const options = (random: () => number): BackoffOptions => ({
      ...base,
      strategy: BackoffStrategy.EqualJitter,
      random,
    });

    it('waits at least half the ceiling and less than the ceiling', () => {
      expect(
        backoffDelay(
          1,
          options(() => 0),
        ),
      ).toBe(50);
      expect(
        backoffDelay(
          1,
          options(() => 0.5),
        ),
      ).toBe(75);
      expect(
        backoffDelay(
          3,
          options(() => 0),
        ),
      ).toBe(200);
      expect(
        backoffDelay(
          10,
          options(() => 0.999_999),
        ),
      ).toBe(999);
    });
  });

  describe('validation', () => {
    const valid: BackoffOptions = { ...base, strategy: BackoffStrategy.None };

    it.each([0, -1, 1.5, Number.NaN, MAX_BACKOFF_ATTEMPT + 1])(
      'rejects attempt %p',
      (attempt) => {
        expect(() => backoffDelay(attempt, valid)).toThrow(
          InvalidArgumentError,
        );
      },
    );

    it.each<[string, Partial<BackoffOptions>]>([
      ['negative baseMs', { baseMs: -1 }],
      ['infinite maxMs', { maxMs: Number.POSITIVE_INFINITY }],
      ['maxMs below baseMs', { baseMs: 500, maxMs: 100 }],
      ['factor below 1', { factor: 0.5 }],
      ['NaN factor', { factor: Number.NaN }],
      ['unknown strategy', { strategy: 'linear' as BackoffStrategy }],
    ])('rejects %s', (_label, override) => {
      const options = { ...valid, ...override };
      expect(() => validateBackoffOptions(options)).toThrow(
        InvalidArgumentError,
      );
      expect(() => backoffDelay(1, options)).toThrow(
        expect.objectContaining({ code: PrimitivesErrorCode.InvalidArgument }),
      );
    });

    it('accepts maxMs equal to baseMs', () => {
      expect(backoffDelay(5, { ...valid, baseMs: 100, maxMs: 100 })).toBe(100);
    });
  });
});

describe('createBackoff', () => {
  it('validates once and returns a delay function', () => {
    const next = createBackoff({
      strategy: BackoffStrategy.EqualJitter,
      baseMs: 10,
      maxMs: 80,
      random: () => 0,
    });
    expect([1, 2, 3, 4, 5].map(next)).toEqual([5, 10, 20, 40, 40]);
  });

  it('fails at creation for invalid options', () => {
    expect(() =>
      createBackoff({
        strategy: BackoffStrategy.None,
        baseMs: 10,
        maxMs: 1,
      }),
    ).toThrow(InvalidArgumentError);
  });
});
