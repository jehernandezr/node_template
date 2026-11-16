import 'package:shell_core/shell_core.dart';

import '../session/session_builder.dart';

/// A scope over demo services, with the repositories already registered.
final class TestScope {
  /// Creates a scope for [userId] in [mode]. Live mode is not supported here
  /// because it needs a client: the constructor throws [ArgumentError] for it.
  TestScope({String userId = 'user-1', ShellMode mode = ShellMode.demo})
    : _scope = MicrofrontendScope(
        ShellServices(
          session: SessionBuilder(userId: userId).build(),
          mode: _demoOnly(mode),
        ),
      );

  final MicrofrontendScope _scope;

  /// The scope. Dispose it with `addTearDown(testScope.scope.dispose)`.
  MicrofrontendScope get scope => _scope;

  /// Registers [repository] under its static type `T` and returns this.
  TestScope withRepository<T extends Object>(T repository) {
    _scope.get<T>((_) => repository);
    return this;
  }

  static ShellMode _demoOnly(ShellMode mode) {
    if (mode == ShellMode.live) {
      throw ArgumentError.value(
        mode,
        'mode',
        'TestScope only builds demo scopes',
      );
    }
    return mode;
  }
}
