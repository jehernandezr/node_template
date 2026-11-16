import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { NotificationsErrorCode as C } from '../enums/identifiers.enum.js';

const pub = ErrorSpecs.pub;
const internal = ErrorSpecs.internal;

/** Catálogo de los códigos de notifications. */
export const notificationsErrorCatalog = defineErrorCatalog(C, {
  [C.InboxNotFound]: pub(
    404,
    false,
    'La notificación no existe en la bandeja del usuario.',
  ),
  [C.PreferencesInvalidQuietHours]: pub(
    400,
    false,
    'El horario de silencio es inválido: falta la zona horaria o las horas no tienen el formato HH:mm.',
  ),
  [C.EmailRecipientSuppressed]: internal(
    422,
    false,
    'El destinatario está en la lista de supresión (rebote o queja) y no se le envía correo.',
  ),
  [C.EmailTemplateUnknown]: internal(
    400,
    false,
    'La plantilla de correo pedida no existe.',
  ),
  [C.RealtimeUnauthenticated]: pub(
    401,
    false,
    'La conexión en tiempo real no trae una credencial válida.',
  ),
});
