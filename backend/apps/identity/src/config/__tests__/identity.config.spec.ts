import { randomBytes } from 'node:crypto';
import { Secret, type ConfigEnv } from '@platform/config';
import { IdentityTestEnvironment } from '../../__tests__/utils/index.js';
import { identityConfigSchema } from '../identity.config.js';
import { IdentityMailerKind } from '../identity-mailer-kind.enum.js';

const parseIssues = (env: ConfigEnv): string[] => {
  const result = identityConfigSchema.safeParse(env);
  return result.success
    ? []
    : result.error.issues.map((issue) => String(issue.path[0]));
};

describe('identityConfigSchema', () => {
  it('parses the test environment and keeps the secrets as Secret', () => {
    const env = IdentityTestEnvironment.build();

    const config = identityConfigSchema.parse(env);

    expect(config.IDENTITY_REGION).toBe('eu');
    expect(config.ACCESS_TOKEN_TTL).toBe(600_000);
    expect(config.IDENTITY_AUDIENCES).toEqual(['api']);
    expect(config.IDENTITY_MAILER).toBe(IdentityMailerKind.Memory);
    expect(Secret.is(config.INTERNAL_API_SHARED_SECRET)).toBe(true);
    expect(config.INTERNAL_API_SHARED_SECRET.reveal()).toBe(
      env['INTERNAL_API_SHARED_SECRET'],
    );
  });

  it.each(['production', 'test'])(
    'refuses the console mailer in %s',
    (nodeEnv) => {
      expect(
        parseIssues(
          IdentityTestEnvironment.build({
            NODE_ENV: nodeEnv,
            IDENTITY_MAILER: 'console',
          }),
        ),
      ).toContain('IDENTITY_MAILER');
    },
  );

  it('accepts the console mailer in development', () => {
    const config = identityConfigSchema.parse(
      IdentityTestEnvironment.build({
        NODE_ENV: 'development',
        IDENTITY_MAILER: 'console',
      }),
    );

    expect(config.IDENTITY_MAILER).toBe(IdentityMailerKind.Console);
  });

  it.each(['5m', '20m'])('refuses an access token lifetime of %s', (ttl) => {
    expect(
      parseIssues(IdentityTestEnvironment.build({ ACCESS_TOKEN_TTL: ttl })),
    ).toContain('ACCESS_TOKEN_TTL');
  });

  it('accepts an access token lifetime of 15 minutes', () => {
    expect(
      identityConfigSchema.parse(
        IdentityTestEnvironment.build({ ACCESS_TOKEN_TTL: '15m' }),
      ).ACCESS_TOKEN_TTL,
    ).toBe(900_000);
  });

  it('refuses an AUTH_ISSUER different from IDENTITY_ISSUER', () => {
    expect(
      parseIssues(
        IdentityTestEnvironment.build({
          AUTH_ISSUER: 'https://otro.identity.test',
        }),
      ),
    ).toContain('AUTH_ISSUER');
  });

  it('refuses a SERVICE_REGION different from IDENTITY_REGION and accepts the same one', () => {
    const region = IdentityTestEnvironment.build()['IDENTITY_REGION'];

    expect(
      parseIssues(
        IdentityTestEnvironment.build({ SERVICE_REGION: 'otra-region' }),
      ),
    ).toContain('IDENTITY_REGION');
    expect(
      parseIssues(IdentityTestEnvironment.build({ SERVICE_REGION: region })),
    ).toEqual([]);
  });

  it('asks for SERVICE_REGION once REGIONS declares regions', () => {
    const region = IdentityTestEnvironment.build()['IDENTITY_REGION'];
    const regions = JSON.stringify([
      {
        code: region,
        apiBaseUrl: 'https://api.example.test',
        issuer: 'https://identity.example.test',
      },
    ]);

    expect(
      parseIssues(IdentityTestEnvironment.build({ REGIONS: regions })),
    ).toContain('SERVICE_REGION');
    expect(
      parseIssues(
        IdentityTestEnvironment.build({
          REGIONS: regions,
          SERVICE_REGION: region,
        }),
      ),
    ).toEqual([]);
  });

  it('refuses a secret shorter than its minimum', () => {
    const short = randomBytes(23).toString('base64url');

    expect(short).toHaveLength(31);
    expect(
      parseIssues(
        IdentityTestEnvironment.build({ IDENTITY_EMAIL_PEPPER: short }),
      ),
    ).toContain('IDENTITY_EMAIL_PEPPER');
  });

  it('refuses an audience that does not exist', () => {
    expect(
      parseIssues(
        IdentityTestEnvironment.build({ IDENTITY_AUDIENCES: 'mobile' }),
      ),
    ).toContain('IDENTITY_AUDIENCES');
  });

  it('refuses an absolute session lifetime shorter than the idle one', () => {
    expect(
      parseIssues(
        IdentityTestEnvironment.build({
          SESSION_IDLE_TTL: '2d',
          SESSION_ABSOLUTE_TTL: '1d',
        }),
      ),
    ).toContain('SESSION_ABSOLUTE_TTL');
  });
});
