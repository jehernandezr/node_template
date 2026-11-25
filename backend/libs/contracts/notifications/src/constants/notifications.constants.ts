import { NotificationType } from '../enums/notifications.enum.js';

/** Field limits of notifications. Every text and every list in the contract is bounded by one of these values. */
export const NotificationsLimits = {
  titleMaxLength: 200,
  bodyMaxLength: 1000,
  /** 24-hour `HH:mm` time of the quiet hours. */
  quietTimePattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
  /** IANA time zone, for example `America/Bogota`. */
  timezoneMaxLength: 64,
  maxChannels: 3,
  maxTypes: 4,
  maxParameters: 10,
  parameterValueMaxLength: 512,
  recipientMaxLength: 254,
  localeMaxLength: 35,
} as const;

/** Delivery rules that do not depend on user preferences. */
export const NotificationPolicy = {
  /** Types that ignore preferences and quiet hours, and go out through every channel. */
  mandatoryTypes: [NotificationType.SecurityAlert],
} as const;
