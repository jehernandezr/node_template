/// Test doubles and utilities shared by the front-end packages.
///
/// Used only as a dev_dependency: production code never imports it.
library;

export 'src/a11y/expect_accessible.dart';
export 'src/app/test_app.dart';
export 'src/auth/fake_auth_repository.dart';
export 'src/auth/fake_device_key_port.dart';
export 'src/auth/fake_token_store.dart';
export 'src/clock/fake_clock.dart';
export 'src/errors/fake_failure.dart';
export 'src/http/fake_identity_server.dart';
export 'src/http/scripted_transport.dart';
export 'src/layout/pump_at_text_scale.dart';
export 'src/layout/pump_at_widths.dart';
export 'src/problem/problem_fixtures.dart';
export 'src/scope/test_scope.dart';
export 'src/session/session_builder.dart';
export 'src/shell/deferred_libraries_preloader.dart';
export 'src/shell/route_paths.dart';
export 'src/shell/runtime_settler.dart';
export 'src/shell/scenarios/scenario_identity.dart';
export 'src/shell/scenarios/scenario_probe.dart';
export 'src/shell/scenarios/shell_fixture.dart';
export 'src/shell/scenarios/shell_scenario_setup.dart';
export 'src/shell/scenarios/shell_scenarios.dart';
