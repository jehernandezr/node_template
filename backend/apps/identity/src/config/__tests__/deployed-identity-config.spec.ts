import { DeployEnvironment, type ConfigEnv } from '@platform/config';
import { DeployedServiceEnvironment } from '@platform/config/test-utils';
import { regionsConfigSchema } from '@platform/service';
import { IdentityTestEnvironment } from '../../__tests__/utils/index.js';
import { IdentityMailerKind } from '../identity-mailer-kind.enum.js';
import { identityConfigSchema } from '../identity.config.js';

const deployed = (environment: DeployEnvironment): ConfigEnv =>
  IdentityTestEnvironment.build(
    DeployedServiceEnvironment.of(
      'identity',
      environment,
      IdentityTestEnvironment.build(),
    ),
  );

describe.each(DeployedServiceEnvironment.ENVIRONMENTS)(
  'identity with its %s values',
  (environment) => {
    it('starts and sends email through notifications', () => {
      const parsed = identityConfigSchema.safeParse(deployed(environment));

      expect(parsed.error).toBeUndefined();
      expect(parsed.data?.IDENTITY_MAILER).toBe(
        IdentityMailerKind.Notifications,
      );
    });

    it('serves the region and issuer Terraform builds for it', () => {
      const values = deployed(environment);
      const regions = regionsConfigSchema.safeParse(values);

      expect(regions.error).toBeUndefined();
      expect(values['IDENTITY_REGION']).toBe(regions.data?.SERVICE_REGION);
      expect(values['IDENTITY_ISSUER']).toBe(
        regions.data?.REGIONS.find(
          (region) => region.code === regions.data?.SERVICE_REGION,
        )?.issuer,
      );
    });

    it.each([IdentityMailerKind.Memory, IdentityMailerKind.Console])(
      'rejects the %s mailer',
      (mailer) => {
        expect(
          identityConfigSchema.safeParse({
            ...deployed(environment),
            IDENTITY_MAILER: mailer,
          }).success,
        ).toBe(false);
      },
    );
  },
);

describe('identity with its prod values', () => {
  it('rejects the smoke account', () => {
    expect(
      identityConfigSchema.safeParse({
        ...deployed(DeployEnvironment.Prod),
        IDENTITY_SMOKE_ACCOUNT: JSON.stringify({
          email: 'smoke@identity.test',
        }),
      }).success,
    ).toBe(false);
  });
});
