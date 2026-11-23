import { FlagStoreKind } from '../flag-store-kind.enum.js';
import { flagsConfigSchema } from '../flags.config.js';

describe('flagsConfigSchema', () => {
  it('defaults to the configuration store with no flags', () => {
    expect(flagsConfigSchema.parse({})).toEqual({
      FLAGS_STORE: FlagStoreKind.Config,
      FEATURE_FLAGS: [],
    });
  });

  it('reads the rules from FEATURE_FLAGS as JSON', () => {
    const settings = flagsConfigSchema.parse({
      FEATURE_FLAGS: JSON.stringify([
        { flag: 'new_reports', enabled: true, plans: ['enterprise'] },
      ]),
    });

    expect(settings.FEATURE_FLAGS).toEqual([
      {
        flag: 'new_reports',
        enabled: true,
        rolloutPercent: 0,
        plans: ['enterprise'],
      },
    ]);
  });

  it.each([
    ['text that is not JSON', 'new_reports=on'],
    [
      'a percentage above 100',
      JSON.stringify([{ flag: 'a', enabled: true, rolloutPercent: 101 }]),
    ],
    [
      'the same flag twice',
      JSON.stringify([
        { flag: 'a', enabled: true },
        { flag: 'a', enabled: false },
      ]),
    ],
  ])('rejects %s', (_, raw) => {
    expect(flagsConfigSchema.safeParse({ FEATURE_FLAGS: raw }).success).toBe(
      false,
    );
  });
});
