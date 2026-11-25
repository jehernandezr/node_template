/** Estado de un correo en el registro. */
export enum EmailStatus {
  /** Reservado antes de entregarlo al proveedor: un reintento con el mismo `messageId` no lo vuelve a enviar. */
  Sending = 'sending',
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

/** Lo que dice el registro de un correo antes de enviarlo. */
export enum EmailReservationKind {
  /** Este envío es el dueño del `messageId`: puede entregarlo al proveedor. */
  Reserved = 'reserved',
  /** Ya se envió o hay otro envío en curso: este no debe enviar. */
  Taken = 'taken',
}

export type EmailReservation =
  | { readonly kind: EmailReservationKind.Reserved }
  | {
      readonly kind: EmailReservationKind.Taken;
      readonly current: EmailRecord;
    };

/** Registro de correos enviados y lista de supresión, en el catálogo. */
export abstract class EmailLedger {
  abstract find(messageId: string): Promise<EmailRecord | undefined>;

  /**
   * Reserva el `messageId` en `Sending` de forma atómica, antes de enviar. Lo toma si no existe, si el envío anterior
   * falló o si quedó en `Sending` desde antes de `abandonedBefore` (el proceso que lo reservó cayó). Si no, devuelve el
   * registro vigente.
   */
  abstract reserve(
    entry: Omit<EmailRecord, 'status' | 'providerId'>,
    abandonedBefore: Date,
  ): Promise<EmailReservation>;

  /** Guarda o reemplaza el registro del correo. */
  abstract record(entry: EmailRecord): Promise<void>;

  abstract isSuppressed(recipientHash: string): Promise<boolean>;

  abstract suppress(recipientHash: string, reason: string): Promise<void>;
}
