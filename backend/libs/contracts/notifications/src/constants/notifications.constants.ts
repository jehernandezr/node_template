import { NotificationType } from '../enums/notifications.enum.js';

/** Límites de los campos de notifications. Todo texto y toda lista del contrato se acotan con uno de estos valores. */
export const NotificationsLimits = {
  titleMaxLength: 200,
  bodyMaxLength: 1000,
  /** Hora `HH:mm` de 24 horas del horario de silencio. */
  quietTimePattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
  /** Zona horaria IANA, por ejemplo `America/Bogota`. */
  timezoneMaxLength: 64,
  maxChannels: 3,
  maxTypes: 4,
  maxParameters: 10,
  parameterValueMaxLength: 512,
  recipientMaxLength: 254,
  localeMaxLength: 35,
} as const;

/** Reglas de entrega que no dependen de las preferencias del usuario. */
export const NotificationPolicy = {
  /** Tipos que ignoran las preferencias y el horario de silencio, y salen por todos los canales. */
  mandatoryTypes: [NotificationType.SecurityAlert],
} as const;
