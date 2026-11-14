/** Permisos de un usuario dentro de un tenant. */
export enum Permission {
  TasksRead = 'tasks:read',
  TasksWrite = 'tasks:write',
  BillingRead = 'billing:read',
  BillingWrite = 'billing:write',
  BackofficeAccess = 'backoffice:access',
}

/** Roles de la plataforma, fuera de cualquier tenant. */
export enum PlatformRole {
  SuperAdmin = 'super_admin',
  Support = 'support',
  Finance = 'finance',
  ReadOnly = 'read_only',
}

/** Funcionalidades incluidas en el plan de un tenant. */
export enum PlanFeature {
  AiAssistant = 'ai_assistant',
  Webhooks = 'webhooks',
  Billing = 'billing',
}

/** Feature flags que habilitan partes del producto. */
export enum FeatureFlag {
  NewReports = 'new_reports',
}
