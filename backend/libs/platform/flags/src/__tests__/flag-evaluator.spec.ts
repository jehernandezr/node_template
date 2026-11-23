import { FlagEvaluator } from '../flag-evaluator.js';
import type { FlagContext } from '../flag-context.js';
import type { FlagRule } from '../flag-rule.js';
import { InMemoryFlagStore } from '../in-memory-flag-store.js';
import { RolloutBucket } from '../rollout-bucket.js';

const TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f02';
const OTHER_TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f03';
const USER = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f01';

const context = (overrides: Partial<FlagContext> = {}): FlagContext => ({
  tenantId: OTHER_TENANT,
  userId: USER,
  ...overrides,
});

const rule = (overrides: Partial<FlagRule> = {}): FlagRule => ({
  flag: 'new_reports',
  enabled: true,
  rolloutPercent: 0,
  ...overrides,
});

const evaluatorWith = (...rules: FlagRule[]): FlagEvaluator =>
  new FlagEvaluator(new InMemoryFlagStore(rules));

describe('FlagEvaluator', () => {
  describe('explicit targets', () => {
    it.each<[string, Partial<FlagRule>, Partial<FlagContext>]>([
      ['the user', { users: [USER] }, {}],
      ['the tenant', { tenants: [TENANT] }, { tenantId: TENANT }],
      ['the plan', { plans: ['enterprise'] }, { plan: 'enterprise' }],
      ['a group', { groups: ['beta'] }, { groups: ['staff', 'beta'] }],
    ])('turns the flag on when the rule targets %s', async (_, target, ctx) => {
      const flags = await evaluatorWith(rule(target)).enabledFlags(
        context(ctx),
      );

      expect(flags).toEqual(['new_reports']);
    });

    it('keeps the flag off for a context nobody targets', async () => {
      const evaluator = evaluatorWith(
        rule({ tenants: [TENANT], plans: ['enterprise'], groups: ['beta'] }),
      );

      await expect(
        evaluator.isEnabled('new_reports', context({ plan: 'starter' })),
      ).resolves.toBe(false);
    });

    it('keeps a disabled flag off even for its targets', async () => {
      const evaluator = evaluatorWith(
        rule({ enabled: false, users: [USER], rolloutPercent: 100 }),
      );

      await expect(evaluator.isEnabled('new_reports', context())).resolves.toBe(
        false,
      );
    });
  });

  describe('percentage rollout', () => {
    const bucket = RolloutBucket.of('new_reports', USER);

    it('includes a user whose bucket is below the percentage', async () => {
      const evaluator = evaluatorWith(rule({ rolloutPercent: bucket + 1 }));

      await expect(evaluator.isEnabled('new_reports', context())).resolves.toBe(
        true,
      );
    });

    it('excludes a user whose bucket is at the percentage', async () => {
      const evaluator = evaluatorWith(rule({ rolloutPercent: bucket }));

      await expect(evaluator.isEnabled('new_reports', context())).resolves.toBe(
        false,
      );
    });

    it('turns the flag on for everyone at 100 percent', async () => {
      const evaluator = evaluatorWith(rule({ rolloutPercent: 100 }));

      await expect(evaluator.isEnabled('new_reports', context())).resolves.toBe(
        true,
      );
    });
  });

  it('lists only the flags that apply to the context', async () => {
    const evaluator = evaluatorWith(
      rule({ flag: 'new_reports', users: [USER] }),
      rule({ flag: 'dark_mode', enabled: false, rolloutPercent: 100 }),
      rule({ flag: 'beta_search', tenants: [TENANT] }),
    );

    await expect(evaluator.enabledFlags(context())).resolves.toEqual([
      'new_reports',
    ]);
  });
});
