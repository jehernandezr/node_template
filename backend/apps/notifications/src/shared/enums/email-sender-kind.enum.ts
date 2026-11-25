/** `EmailSender` adapter chosen by `NOTIFICATIONS_EMAIL_SENDER`. */
export enum EmailSenderKind {
  Memory = 'memory',
  Smtp = 'smtp',
  Ses = 'ses',
}
