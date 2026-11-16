import { DefaultPolicies } from '../default-policies.js';
import { PolicyName } from '../policy-name.js';

describe('DefaultPolicies', () => {
  it('registers only the cache and database policies', () => {
    expect([...DefaultPolicies.all().keys()].sort()).toEqual([
      'cache',
      'database',
    ]);
  });

  it('shares the same configuration objects by name', () => {
    expect(DefaultPolicies.all().get(PolicyName.Cache.value)).toBe(
      DefaultPolicies.cache,
    );
    expect(DefaultPolicies.all().get(PolicyName.Database.value)).toBe(
      DefaultPolicies.database,
    );
  });

  it('keeps the cache budget short', () => {
    expect(DefaultPolicies.cache).toMatchObject({
      timeoutMs: 100,
      totalTimeoutMs: 200,
    });
  });

  it('retries the database with three attempts', () => {
    expect(DefaultPolicies.database.retry?.policy.maxAttempts).toBe(3);
  });
});
