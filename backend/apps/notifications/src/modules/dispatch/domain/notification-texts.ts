import { NotificationType, TemplateParameter } from '@contracts/notifications';

/** Title and text of a notification in the user's language. */
export interface NotificationText {
  readonly title: string;
  readonly body: string;
}

type Copy = Readonly<Record<NotificationType, NotificationText>>;

/**
 * The texts of each notification type by language, with `{reference}` replaced by the value the
 * event sends (the invoice number, the alert type). A language without texts uses Spanish.
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
