import { regionsConfigSchema, ServiceRegions } from '../regions.config.js';

const REGIONS = JSON.stringify([
  {
    code: 'us-east-1',
    apiBaseUrl: 'https://us.api.test',
    issuer: 'https://us.id.test',
  },
  {
    code: 'sa-east-1',
    apiBaseUrl: 'https://sa.api.test',
    issuer: 'https://sa.id.test',
  },
]);

describe('regionsConfigSchema', () => {
  it('reads the regions of the deployment and the one this process serves', () => {
    const settings = regionsConfigSchema.parse({
      REGIONS,
      SERVICE_REGION: 'sa-east-1',
    });
    const regions = new ServiceRegions(settings);

    expect(regions.current()).toBe('sa-east-1');
    expect(regions.all().map((region) => region.code)).toEqual([
      'us-east-1',
      'sa-east-1',
    ]);
    expect(regions.apiBaseUrlOf('us-east-1')).toBe('https://us.api.test');
    expect(regions.apiBaseUrlOf('eu-west-1')).toBeUndefined();
  });

  it('runs as a single region when nothing is declared', () => {
    const regions = new ServiceRegions(regionsConfigSchema.parse({}));

    expect(regions.current()).toBeUndefined();
    expect(regions.all()).toEqual([]);
  });

  it('refuses a service region that is not among the regions', () => {
    expect(
      regionsConfigSchema.safeParse({ REGIONS, SERVICE_REGION: 'eu-west-1' })
        .success,
    ).toBe(false);
  });

  it('accepts only the issuer of the region it serves as the issuer of its tokens', () => {
    const settings = regionsConfigSchema.parse({
      REGIONS,
      SERVICE_REGION: 'sa-east-1',
      AUTH_ISSUER: 'https://sa.id.test',
    });

    expect(new ServiceRegions(settings).issuerOf('sa-east-1')).toBe(
      'https://sa.id.test',
    );
    expect(
      regionsConfigSchema.safeParse({
        REGIONS,
        SERVICE_REGION: 'sa-east-1',
        AUTH_ISSUER: 'https://us.id.test',
      }).success,
    ).toBe(false);
  });

  it('refuses regions that are not valid JSON or repeat a code', () => {
    expect(regionsConfigSchema.safeParse({ REGIONS: '[' }).success).toBe(false);
    const repeated = JSON.stringify([
      { code: 'a', apiBaseUrl: 'https://a.test', issuer: 'https://a.test' },
      { code: 'a', apiBaseUrl: 'https://b.test', issuer: 'https://b.test' },
    ]);
    expect(regionsConfigSchema.safeParse({ REGIONS: repeated }).success).toBe(
      false,
    );
  });
});
