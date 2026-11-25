/** Permissions of a user within a tenant. */
export enum Permission {
  TasksRead = 'tasks:read',
  TasksWrite = 'tasks:write',
  BillingRead = 'billing:read',
  BillingWrite = 'billing:write',
  ReportsRead = 'reports:read',
  ReportsWrite = 'reports:write',
  BackofficeAccess = 'backoffice:access',
  IdentityMembersRead = 'identity:members:read',
  IdentityMembersManage = 'identity:members:manage',
  IdentityGroupsManage = 'identity:groups:manage',
  IdentityRolesManage = 'identity:roles:manage',
  IdentityInvitationsManage = 'identity:invitations:manage',
  IdentityServiceAccountsManage = 'identity:service-accounts:manage',
  IdentityApiKeysManage = 'identity:api-keys:manage',
  IdentityTenantManage = 'identity:tenant:manage',
}

/** Platform roles, outside any tenant. */
export enum PlatformRole {
  SuperAdmin = 'super_admin',
  Support = 'support',
  Finance = 'finance',
  ReadOnly = 'read_only',
}

/** Features included in a tenant's plan. */
export enum PlanFeature {
  AiAssistant = 'ai_assistant',
  Webhooks = 'webhooks',
  Billing = 'billing',
  AdvancedReports = 'advanced_reports',
}

/** Feature flags that enable parts of the product. */
export enum FeatureFlag {
  NewReports = 'new_reports',
}
