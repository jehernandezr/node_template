import 'package:i18n/i18n.dart';
import 'package:shell_core/shell_core.dart';

/// Sessions behind the demo sign-in. No password is checked and no server is
/// involved; each shell picks the profiles that make sense on its platform.
enum DemoProfile {
  /// Customer: reads tasks and has the AI assistant plan.
  customer,

  /// Customer without the assistant plan: the assistant stays hidden.
  customerNoAssistant,

  /// Tenant admin: tasks, billing and the AI assistant plan.
  tenantAdmin,

  /// Platform superadmin: no tenant, sees the backoffice.
  superAdmin;

  /// Session the profile signs in with.
  UserSession session() => switch (this) {
    customer => UserSession(
      userId: 'demo-customer',
      tenantId: 'demo-tenant',
      permissions: {Permission.tasksRead},
      features: {PlanFeature.aiAssistant},
    ),
    customerNoAssistant => UserSession(
      userId: 'demo-customer-basic',
      tenantId: 'demo-tenant',
      permissions: {Permission.tasksRead},
    ),
    tenantAdmin => UserSession(
      userId: 'demo-admin',
      tenantId: 'demo-tenant',
      permissions: {
        Permission.tasksRead,
        Permission.tasksWrite,
        Permission.billingRead,
        Permission.billingWrite,
      },
      features: {PlanFeature.aiAssistant, PlanFeature.billing},
    ),
    superAdmin => UserSession(
      userId: 'demo-superadmin',
      platformRoles: {PlatformRole.superAdmin},
    ),
  };

  /// Text of the profile's sign-in button.
  String label(AppLocalizations l10n) => switch (this) {
    customer => l10n.demoSignInCustomer,
    customerNoAssistant => l10n.demoSignInCustomerNoAssistant,
    tenantAdmin => l10n.demoSignInTenantAdmin,
    superAdmin => l10n.demoSignInSuperAdmin,
  };
}
