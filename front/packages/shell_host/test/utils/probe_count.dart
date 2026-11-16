import 'package:shell_core/shell_core.dart';

/// Replayable event of the probe microfrontend, shown as its menu badge.
final class ProbeCount extends ReplayableShellEvent {
  const ProbeCount(this.value);

  final int value;

  /// Count read by `MenuBadge<ProbeCount>`.
  static int valueOf(ProbeCount event) => event.value;
}
