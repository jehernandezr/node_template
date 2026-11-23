/** Adaptador de `EmailSender` que elige `NOTIFICATIONS_EMAIL_SENDER`. */
export enum EmailSenderKind {
  Memory = 'memory',
  Smtp = 'smtp',
  Ses = 'ses',
}
