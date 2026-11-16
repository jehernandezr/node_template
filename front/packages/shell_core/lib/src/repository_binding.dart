import 'enums.dart';
import 'microfrontend_scope.dart';
import 'shell_services.dart';

/// Declares how a microfrontend builds its repository in each [ShellMode].
final class RepositoryBinding<T extends Object> {
  /// A binding with a demo and a live factory.
  const RepositoryBinding({required this.demo, required this.live});

  /// For a microfrontend whose `modes` is `{ShellMode.demo}`.
  const RepositoryBinding.demoOnly({required this.demo}) : live = null;

  /// Builds the in-memory repository.
  final T Function(ShellServices services) demo;

  /// Builds the API repository, or null for a demo-only binding.
  final T Function(ShellServices services)? live;

  /// The repository of [scope]: created on first use by mode, and disposed
  /// by the scope (it implements `ScopedResource`).
  T resolve(MicrofrontendScope scope) => scope.get<T>(_create);

  T _create(ShellServices services) => switch (services.mode) {
    ShellMode.demo => demo(services),
    ShellMode.live => _requireLive()(services),
  };

  T Function(ShellServices services) _requireLive() =>
      live ??
      (throw StateError(
        'RepositoryBinding<$T> is demo only and has no live factory',
      ));
}

/// Resolves a [RepositoryBinding] from a scope.
extension RepositoriesOfScope on MicrofrontendScope {
  /// The repository that [binding] builds for this scope.
  T repository<T extends Object>(RepositoryBinding<T> binding) =>
      binding.resolve(this);
}
