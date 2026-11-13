/// Contracts and composition for the Flutter shells (web and mobile).
library;

export 'package:contracts/contracts.dart'
    show FeatureFlag, PlanFeature, PlatformRole, Permission, SessionAccess;

export 'src/access_rule.dart';
export 'src/deferred_page.dart';
export 'src/enums.dart';
export 'src/events.dart';
export 'src/microfrontend.dart';
export 'src/microfrontend_manifest.dart';
export 'src/microfrontend_registry.dart';
export 'src/microfrontend_scope.dart';
export 'src/screen_route.dart';
export 'src/shell_access.dart';
export 'src/shell_context.dart';
export 'src/shell_event_bus.dart';
export 'src/shell_navigation.dart';
export 'src/shell_router.dart';
export 'src/shell_runtime.dart';
export 'src/shell_services.dart';
export 'src/step_up_requests.dart';
export 'src/user_session.dart';
