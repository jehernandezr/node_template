/** Tipo de notificación: fija la criticidad y qué preferencias aplican. */
export enum NotificationType {
  SecurityAlert = 'security_alert',
  TaskUpdated = 'task_updated',
  InvoiceIssued = 'invoice_issued',
  AccountActivity = 'account_activity',
}

/** Canal por el que sale una notificación. */
export enum NotificationChannel {
  InApp = 'in_app',
  Push = 'push',
  Email = 'email',
}

/** Tramas que el servidor envía por la transmisión en tiempo real (SSE o Socket.IO). */
export enum NotificationFrameType {
  Notification = 'notification',
  UnreadCount = 'unread-count',
  SessionClosed = 'session-closed',
}

/** Plantillas de correo transaccional. */
export enum EmailTemplate {
  VerifyEmail = 'verify_email',
  PasswordReset = 'password_reset',
  MfaCode = 'mfa_code',
  EmailChange = 'email_change',
  Invitation = 'invitation',
}

/** Nombres de los datos que llenan una plantilla o el texto de una notificación. */
export enum TemplateParameter {
  Code = 'code',
  Link = 'link',
  DisplayName = 'display_name',
  TenantName = 'tenant_name',
  Reference = 'reference',
}
