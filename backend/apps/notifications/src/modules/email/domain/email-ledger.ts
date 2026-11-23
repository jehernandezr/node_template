/** Estado de un correo en el registro. */
export enum EmailStatus {
  Sent = 'sent',
  Failed = 'failed',
}

/** Lo que queda de un correo: qué plantilla y versión, a quién (su huella) y cómo terminó. Nunca el cuerpo. */
export interface EmailRecord {
  readonly messageId: string;
  readonly template: string;
  readonly templateVersion: number;
  readonly recipientHash: string;
  readonly status: EmailStatus;
  readonly providerId?: string;
  readonly traceId?: string;
}

/** Registro de correos enviados y lista de supresión, en el catálogo. */
export abstract class EmailLedger {
  abstract find(messageId: string): Promise<EmailRecord | undefined>;

  /** Guarda o reemplaza el registro del correo. */
  abstract record(entry: EmailRecord): Promise<void>;

  abstract isSuppressed(recipientHash: string): Promise<boolean>;

  abstract suppress(recipientHash: string, reason: string): Promise<void>;
}
