/** Status of an email in the log. */
export enum EmailStatus {
  /** Reserved before handing it to the provider: a retry with the same `messageId` does not send it again. */
  Sending = 'sending',
  Sent = 'sent',
  Failed = 'failed',
}

/** What remains of an email: which template and version, to whom (their hash) and how it ended. Never the body. */
export interface EmailRecord {
  readonly messageId: string;
  readonly template: string;
  readonly templateVersion: number;
  readonly recipientHash: string;
  readonly status: EmailStatus;
  readonly providerId?: string;
  readonly traceId?: string;
}

/** What an email's log entry says before sending it. */
export enum EmailReservationKind {
  /** This send owns the `messageId`: it can hand it to the provider. */
  Reserved = 'reserved',
  /** It was already sent or another send is in progress: this one must not send. */
  Taken = 'taken',
}

export type EmailReservation =
  | { readonly kind: EmailReservationKind.Reserved }
  | {
      readonly kind: EmailReservationKind.Taken;
      readonly current: EmailRecord;
    };

/** Log of sent emails and suppression list, in the catalog. */
export abstract class EmailLedger {
  /**
   * Reads an email's log entry.
   * @param messageId Message id.
   * @returns The log entry, or `undefined` if it was never reserved.
   */
  abstract find(messageId: string): Promise<EmailRecord | undefined>;

  /**
   * Reserves the `messageId` in `Sending` atomically, before sending. Takes it if it does not exist, if the previous send
   * failed or if it stayed in `Sending` longer than `abandonedAfterMs` (the process that reserved it crashed), measured with the
   * log's clock.
   * @param entry Email to reserve.
   * @param abandonedAfterMs Milliseconds after which a reservation in `Sending` is considered abandoned.
   * @returns `Reserved` if this send is the owner, or `Taken` with the current log entry.
   */
  abstract reserve(
    entry: Omit<EmailRecord, 'status' | 'providerId'>,
    abandonedAfterMs: number,
  ): Promise<EmailReservation>;

  /**
   * Saves or replaces the email's log entry.
   * @param entry Full log entry, with its state and the provider's id if it was sent.
   */
  abstract record(entry: EmailRecord): Promise<void>;

  /**
   * Returns whether the recipient is in the suppression list.
   * @param recipientHash Hash of the recipient.
   * @returns `true` if they must not be written to.
   */
  abstract isSuppressed(recipientHash: string): Promise<boolean>;

  /**
   * Adds the recipient to the suppression list; repeating it changes nothing.
   * @param recipientHash Hash of the recipient.
   * @param reason Reason, such as a bounce or a complaint.
   */
  abstract suppress(recipientHash: string, reason: string): Promise<void>;
}
