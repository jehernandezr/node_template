/// What the web and mobile shells share: [ShellHost] (registry, session,
/// runtime, router, step-up and badges), the root [ShellHostApp], the sign-in,
/// step-up and forbidden pages, the demo profiles and the screen loader.
///
/// A shell only brings its manifests, its frame and its connection.
library;

export 'src/demo_profiles.dart';
export 'src/identity_connection_factory.dart';
export 'src/menu_badges.dart';
export 'src/pages/forbidden_page.dart';
export 'src/pages/login_page.dart';
export 'src/pages/sign_in_form.dart';
export 'src/pages/step_up_form.dart';
export 'src/pages/step_up_page.dart';
export 'src/return_location.dart';
export 'src/screen_loader.dart';
export 'src/session_binding.dart';
export 'src/shell_destination.dart';
export 'src/shell_host.dart';
export 'src/shell_host_app.dart';
export 'src/shell_load_error.dart';
export 'src/shell_menu_model.dart';
export 'src/shell_routes.dart';
