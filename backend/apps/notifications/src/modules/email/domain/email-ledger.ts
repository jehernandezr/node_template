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
  /**
   * Lee el registro de un correo.
   * @param messageId Id del mensaje.
   * @returns El registro, o `undefined` si nunca se reservó.
   */
  abstract find(messageId: string): Promise<EmailRecord | undefined>;

  /**
   * Reserva el `messageId` en `Sending` de forma atómica, antes de enviar. Lo toma si no existe, si el envío anterior
   * falló o si quedó en `Sending` más de `abandonedAfterMs` (el proceso que lo reservó cayó), medido con el reloj del
   * registro.
   * @param entry Correo a reservar.
   * @param abandonedAfterMs Milisegundos tras los que una reserva en `Sending` se da por abandonada.
   * @returns `Reserved` si este envío es el dueño, o `Taken` con el registro vigente.
   */
  abstract reserve(
    entry: Omit<EmailRecord, 'status' | 'providerId'>,
    abandonedAfterMs: number,
  ): Promise<EmailReservation>;

  /**
   * Guarda o reemplaza el registro del correo.
   * @param entry Registro completo, con su estado y el id del proveedor si se envió.
   */
  abstract record(entry: EmailRecord): Promise<void>;

  /**
   * Indica si el destinatario está en la lista de supresión.
   * @param recipientHash Huella del destinatario.
   * @returns `true` si no se le debe escribir.
   */
  abstract isSuppressed(recipientHash: string): Promise<boolean>;

  /**
   * Agrega el destinatario a la lista de supresión; repetirlo no cambia nada.
   * @param recipientHash Huella del destinatario.
   * @param reason Motivo, como un rebote o una queja.
   */
  abstract suppress(recipientHash: string, reason: string): Promise<void>;
}
