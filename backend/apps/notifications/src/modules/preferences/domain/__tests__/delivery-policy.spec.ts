import {
  NotificationChannel,
  NotificationsErrorCode,
  NotificationType,
} from '@contracts/notifications';
import { DeliveryPolicy } from '../delivery-policy.js';
import { NotificationPreferences } from '../notification-preferences.js';
import { QuietHours } from '../quiet-hours.js';

const policy = new DeliveryPolicy();
const NIGHT_IN_BOGOTA = new Date('2026-11-20T04:00:00.000Z');
const NOON_IN_BOGOTA = new Date('2026-11-20T17:00:00.000Z');

const preferences = (
  overrides: Partial<Parameters<typeof NotificationPreferences.of>[0]> = {},
) =>
  NotificationPreferences.of({
    enabled: [
      {
        type: NotificationType.TaskUpdated,
        channels: [NotificationChannel.Email],
      },
    ],
    quietStart: '22:00',
    quietEnd: '07:00',
    timezone: 'America/Bogota',
    ...overrides,
  });

describe('DeliveryPolicy', () => {
  it('uses the channels the user chose for the type, plus the inbox', () => {
    expect(
      policy.channels({
        type: NotificationType.TaskUpdated,
        preferences: preferences(),
        now: NOON_IN_BOGOTA,
        online: false,
      }),
    ).toEqual([NotificationChannel.InApp, NotificationChannel.Email]);
  });

  it('keeps only the inbox during quiet hours in the user time zone', () => {
    expect(
      policy.channels({
        type: NotificationType.TaskUpdated,
        preferences: preferences(),
        now: NIGHT_IN_BOGOTA,
        online: false,
      }),
    ).toEqual([NotificationChannel.InApp]);
  });

  it('sends security alerts through every channel at any hour', () => {
    expect(
      policy.channels({
        type: NotificationType.SecurityAlert,
        preferences: preferences({
          enabled: [{ type: NotificationType.SecurityAlert, channels: [] }],
        }),
        now: NIGHT_IN_BOGOTA,
        online: true,
      }),
    ).toEqual(Object.values(NotificationChannel));
  });
});

describe('QuietHours', () => {
  it.each([
    ['22:00', '07:00', '2026-11-20T03:30:00.000Z', true],
    ['22:00', '07:00', '2026-11-20T12:30:00.000Z', false],
    ['13:00', '15:00', '2026-11-20T14:00:00.000Z', true],
    ['09:00', '09:00', '2026-11-20T09:00:00.000Z', false],
  ])(
    'from %s to %s in UTC contains %s: %s',
    (start, end, instant, expected) => {
      expect(
        QuietHours.parse(start, end, 'UTC')?.contains(new Date(instant)),
      ).toBe(expected);
    },
  );

  it('rejects preferences with an unknown time zone', () => {
    expect(() => preferences({ timezone: 'Mars/Olympus' })).toThrow(
      expect.objectContaining({
        code: NotificationsErrorCode.PreferencesInvalidQuietHours,
      }),
    );
  });
});
