/** Notification type: sets the criticality and which preferences apply. */
export enum NotificationType {
  SecurityAlert = 'security_alert',
  TaskUpdated = 'task_updated',
  InvoiceIssued = 'invoice_issued',
  AccountActivity = 'account_activity',
}

/** Channel through which a notification goes out. */
export enum NotificationChannel {
  InApp = 'in_app',
  Push = 'push',
  Email = 'email',
}

/** Frames the server sends over the real-time stream (SSE or Socket.IO). */
export enum NotificationFrameType {
  Notification = 'notification',
  UnreadCount = 'unread-count',
  SessionClosed = 'session-closed',
}

/** Transactional email templates. */
export enum EmailTemplate {
  VerifyEmail = 'verify_email',
  PasswordReset = 'password_reset',
  MfaCode = 'mfa_code',
  EmailChange = 'email_change',
  Invitation = 'invitation',
  EmailAlreadyRegistered = 'email_already_registered',
  MfaRecovery = 'mfa_recovery',
}

/** Names of the data that fill a template or the text of a notification. */
export enum TemplateParameter {
  Code = 'code',
  Link = 'link',
  DisplayName = 'display_name',
  TenantName = 'tenant_name',
  Reference = 'reference',
  AvailableAt = 'available_at',
}
