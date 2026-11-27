import { randomBytes } from 'node:crypto';
import { Test } from '@nestjs/testing';
import {
  ConfigErrorCode,
  DeployEnvironment,
  Secret,
  type ConfigEnv,
} from '@platform/config';
import { ConfigModule } from '@platform/config/nest';
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

  it.each([
    DeployEnvironment.Dev,
    DeployEnvironment.Staging,
    DeployEnvironment.Prod,
  ])('sends email only through notifications in %s', (environment) => {
    for (const mailer of [
      IdentityMailerKind.Memory,
      IdentityMailerKind.Console,
    ]) {
      expect(
        parseIssues(
          IdentityTestEnvironment.build({
            DEPLOY_ENVIRONMENT: environment,
            IDENTITY_MAILER: mailer,
          }),
        ),
      ).toEqual(['IDENTITY_MAILER']);
    }
    expect(
      parseIssues(
        IdentityTestEnvironment.build({
          DEPLOY_ENVIRONMENT: environment,
          IDENTITY_MAILER: IdentityMailerKind.Notifications,
        }),
      ),
    ).toEqual([]);
  });

  it('accepts the console mailer locally, whatever NODE_ENV says', () => {
    const config = identityConfigSchema.parse(
      IdentityTestEnvironment.build({
        NODE_ENV: 'production',
        DEPLOY_ENVIRONMENT: DeployEnvironment.Local,
        IDENTITY_MAILER: IdentityMailerKind.Console,
      }),
    );

    expect(config.IDENTITY_MAILER).toBe(IdentityMailerKind.Console);
  });

  it('refuses the smoke account in prod and accepts it in staging', () => {
    const smokeAccount = JSON.stringify({ email: 'smoke@identity.test' });

    expect(
      parseIssues(
        IdentityTestEnvironment.build({
          DEPLOY_ENVIRONMENT: DeployEnvironment.Prod,
          IDENTITY_MAILER: IdentityMailerKind.Notifications,
          IDENTITY_SMOKE_ACCOUNT: smokeAccount,
        }),
      ),
    ).toEqual(['IDENTITY_SMOKE_ACCOUNT']);
    expect(
      parseIssues(
        IdentityTestEnvironment.build({
          DEPLOY_ENVIRONMENT: DeployEnvironment.Staging,
          IDENTITY_MAILER: IdentityMailerKind.Notifications,
          IDENTITY_SMOKE_ACCOUNT: smokeAccount,
        }),
      ),
    ).toEqual([]);
  });

  it('does not start in prod with the console mailer', async () => {
    const starting = Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          schema: identityConfigSchema,
          env: IdentityTestEnvironment.build({
            DEPLOY_ENVIRONMENT: DeployEnvironment.Prod,
            IDENTITY_MAILER: IdentityMailerKind.Console,
          }),
        }),
      ],
    }).compile();

    await expect(starting).rejects.toMatchObject({
      code: ConfigErrorCode.Invalid,
    });
    await expect(starting).rejects.toThrow(/IDENTITY_MAILER/);
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
          AUTH_ISSUER: 'https://other.identity.test',
        }),
      ),
    ).toContain('AUTH_ISSUER');
  });

  it('refuses a SERVICE_REGION different from IDENTITY_REGION and accepts the same one', () => {
    const region = IdentityTestEnvironment.build()['IDENTITY_REGION'];

    expect(
      parseIssues(
        IdentityTestEnvironment.build({ SERVICE_REGION: 'other-region' }),
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
