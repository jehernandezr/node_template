import { NotificationType, TemplateParameter } from '@contracts/notifications';

/** Título y texto de una notificación en el idioma del usuario. */
export interface NotificationText {
  readonly title: string;
  readonly body: string;
}

type Copy = Readonly<Record<NotificationType, NotificationText>>;

/**
 * Los textos de cada tipo de notificación por idioma, con `{reference}` reemplazado por el dato que manda el
 * evento (el número de la factura, el tipo de alerta). Un idioma sin textos usa el español.
 */
export class NotificationTexts {
  private static readonly FALLBACK = 'es';
  private static readonly COPIES: Readonly<Record<string, Copy>> = {
    es: {
      [NotificationType.SecurityAlert]: {
        title: 'Alerta de seguridad',
        body: 'Detectamos actividad en tu cuenta: {reference}. Si no fuiste tú, cambia tu contraseña.',
      },
      [NotificationType.TaskUpdated]: {
        title: 'Tarea actualizada',
        body: 'Alguien cambió una tarea que creaste: {reference}.',
      },
      [NotificationType.InvoiceIssued]: {
        title: 'Factura emitida',
        body: 'Se emitió la factura {reference}.',
      },
      [NotificationType.AccountActivity]: {
        title: 'Actividad en tu cuenta',
        body: '{reference}',
      },
    },
    en: {
      [NotificationType.SecurityAlert]: {
        title: 'Security alert',
        body: 'We noticed activity on your account: {reference}. If it was not you, change your password.',
      },
      [NotificationType.TaskUpdated]: {
        title: 'Task updated',
        body: 'Someone changed a task you created: {reference}.',
      },
      [NotificationType.InvoiceIssued]: {
        title: 'Invoice issued',
        body: 'Invoice {reference} was issued.',
      },
      [NotificationType.AccountActivity]: {
        title: 'Account activity',
        body: '{reference}',
      },
    },
  };

  static of(
    type: NotificationType,
    locale: string,
    parameters: ReadonlyMap<TemplateParameter, string>,
  ): NotificationText {
    const copies =
      NotificationTexts.COPIES[locale] ??
      NotificationTexts.COPIES[locale.split('-')[0] ?? ''] ??
      NotificationTexts.COPIES[NotificationTexts.FALLBACK];
    const copy = copies?.[type] ?? { title: type, body: type };
    const reference = parameters.get(TemplateParameter.Reference) ?? '';
    return {
      title: copy.title,
      body: copy.body.replace('{reference}', reference).trim() || copy.title,
    };
  }
}
