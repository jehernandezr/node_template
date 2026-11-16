import { SecurityAlertType } from '@contracts/identity';
import { IdentityEmailTemplate } from '../../../shared/enums/identity-email-template.enum.js';
import {
  InMemoryIdentityMailer,
  InMemorySecurityAlerts,
} from './utils/index.js';

const ANA = {
  userId: '018f0000-0000-7000-8000-000000000001',
  homeTenantId: 'tenant-a',
};

describe('InMemorySecurityAlerts', () => {
  it('records every raised alert in order', async () => {
    const alerts = new InMemorySecurityAlerts();

    await alerts.raise({
      type: SecurityAlertType.NewDeviceSignIn,
      user: ANA,
      context: { device: 'iPhone', city: 'CDMX' },
    });
    await alerts.raise({ type: SecurityAlertType.PasswordChanged, user: ANA });

    expect(alerts.raised.map((alert) => alert.type)).toEqual([
      SecurityAlertType.NewDeviceSignIn,
      SecurityAlertType.PasswordChanged,
    ]);
  });
});

describe('InMemoryIdentityMailer', () => {
  it('records each message and exposes the last one', async () => {
    const mailer = new InMemoryIdentityMailer();

    expect(mailer.last()).toBeUndefined();

    await mailer.send(
      IdentityEmailTemplate.EmailVerification,
      'ana@example.com',
      {
        code: 'enlace-de-prueba',
      },
    );
    await mailer.send(IdentityEmailTemplate.MfaCode, 'ana@example.com', {
      name: 'Ana',
    });

    expect(mailer.sent).toHaveLength(2);
    expect(mailer.last()).toEqual({
      template: IdentityEmailTemplate.MfaCode,
      to: 'ana@example.com',
      variables: { name: 'Ana' },
    });
  });
});
