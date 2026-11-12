import 'package:shell_core/shell_core.dart';

/// Sessions behind the demo sign-in on `/login`. There is no real auth yet.
final UserSession demoClientSession = UserSession(
  userId: 'demo-client',
  tenantId: 'demo-tenant',
  permissions: {Permission.tasksRead},
  planFeatures: {PlanFeature.aiAssistant},
);

/// Client without the AI assistant plan: the assistant tab must stay hidden.
final UserSession demoClientNoAssistantSession = UserSession(
  userId: 'demo-client-basic',
  tenantId: 'demo-tenant',
  permissions: {Permission.tasksRead},
);
