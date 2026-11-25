import { Compensation, defineOperation } from '@contracts/platform';
import {
  NotificationsErrorCode,
  NotificationsOperation,
} from '../enums/identifiers.enum.js';
import {
  EraseNotificationsUserInputSchema,
  EraseNotificationsUserResultSchema,
  NotifyUserInputSchema,
  NotifyUserResultSchema,
  SendEmailInputSchema,
  SendEmailResultSchema,
} from '../schemas/notification.schema.js';

/**
 * Envía un correo transaccional. El código de un solo uso viaja por la API
 * interna y nunca por el bus de eventos.
 */
export const SendEmailOperation = defineOperation({
  id: NotificationsOperation.SendMessage,
  input: SendEmailInputSchema,
  output: SendEmailResultSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason: 'Un correo ya enviado no se puede retirar.',
  errors: [
    NotificationsErrorCode.EmailRecipientSuppressed,
    NotificationsErrorCode.EmailTemplateUnknown,
    NotificationsErrorCode.EmailTemplateParameterMissing,
  ],
  timeoutMs: 6_000,
  description:
    'Envía un correo transaccional. El código de un solo uso viaja por la API interna y nunca por el bus.',
});

/**
 * Entrega una notificación a un usuario por sus canales. Corre después del
 * pivote de la saga y se repite con el mismo `notificationId`.
 */
export const NotifyUserOperation = defineOperation({
  id: NotificationsOperation.NotifyUser,
  input: NotifyUserInputSchema,
  output: NotifyUserResultSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'Una notificación ya entregada no se retira; el paso corre después del pivote de la saga y se repite con el mismo notificationId.',
  errors: [],
  timeoutMs: 6_000,
  description: 'Entrega una notificación a un usuario por sus canales.',
});

/** Borra las notificaciones, preferencias y entregas de un usuario. */
export const EraseNotificationsUserDataOperation = defineOperation({
  id: NotificationsOperation.EraseUserData,
  input: EraseNotificationsUserInputSchema,
  output: EraseNotificationsUserResultSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'El borrado de datos del usuario es irreversible y corre después del pivote de la saga.',
  errors: [],
  timeoutMs: 6_000,
  description:
    'Borra las notificaciones, preferencias y entregas de un usuario.',
});
