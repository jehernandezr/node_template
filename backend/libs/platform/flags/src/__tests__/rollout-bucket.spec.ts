import { RolloutBucket } from '../rollout-bucket.js';

const USER = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f01';

describe('RolloutBucket', () => {
  it('places the same user and flag in the same bucket every time', () => {
    expect(RolloutBucket.of('new_reports', USER)).toBe(
      RolloutBucket.of('new_reports', USER),
    );
  });

  it('keeps every bucket between 0 and 99', () => {
    const buckets = Array.from({ length: 500 }, (_, index) =>
      RolloutBucket.of('new_reports', `user-${index}`),
    );

    expect(Math.min(...buckets)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...buckets)).toBeLessThan(100);
  });

  it('spreads users across buckets close to the requested share', () => {
    const users = Array.from({ length: 2000 }, (_, index) => `user-${index}`);

    const inFirstQuarter = users.filter(
      (user) => RolloutBucket.of('new_reports', user) < 25,
    ).length;

    expect(inFirstQuarter / users.length).toBeGreaterThan(0.2);
    expect(inFirstQuarter / users.length).toBeLessThan(0.3);
  });
});
