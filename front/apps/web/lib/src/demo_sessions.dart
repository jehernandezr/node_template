import 'package:shell_core/shell_core.dart';

/// Sessions behind the demo sign-in page. There is no server behind them.
abstract final class DemoSessions {
  /// Customer: can read tasks, has no plan features.
  static UserSession customer() => UserSession(
    userId: 'demo-cliente',
    tenantId: 'demo-tenant',
    permissions: {Permission.tasksRead},
  );

  /// Tenant admin: tasks, billing and the AI assistant plan.
  static UserSession tenantAdmin() => UserSession(
    userId: 'demo-admin',
    tenantId: 'demo-tenant',
    permissions: {
      Permission.tasksRead,
      Permission.tasksWrite,
      Permission.billingRead,
      Permission.billingWrite,
    },
    planFeatures: {PlanFeature.aiAssistant, PlanFeature.billing},
  );

  /// Platform superadmin: no tenant, sees the backoffice.
  static UserSession superAdmin() => UserSession(
    userId: 'demo-superadmin',
    platformRoles: {PlatformRole.superAdmin},
  );
}
