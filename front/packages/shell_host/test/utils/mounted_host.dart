import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shell_host/shell_host.dart';
import 'package:test_utils/test_utils.dart';

/// Mounts a [ShellHost] router for a widget test and closes the host inside
/// the test body.
///
/// A testWidgets tear-down runs after the fake zone stops flushing, so a host
/// that already followed a session change never finishes its dispose there.
final class MountedHost {
  const MountedHost(this.host);

  final ShellHost host;

  Future<void> run(WidgetTester tester, Future<void> Function() body) async {
    await tester.pumpWidget(TestApp().wrapRouter(host.router));
    try {
      await body();
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
      await host.dispose();
    }
  }
}
