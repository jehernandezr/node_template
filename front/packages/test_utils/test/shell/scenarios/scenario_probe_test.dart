import 'package:flutter_test/flutter_test.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

void main() {
  test('the probe serves web and mobile in demo and live modes', () {
    final manifest = const ScenarioProbe().manifest();

    expect(manifest.platforms, {AppPlatform.web, AppPlatform.mobile});
    expect(manifest.modes, containsAll([ShellMode.demo, ShellMode.live]));
    expect(manifest.screens.single.path, ScenarioProbe.home);
    expect(manifest.screens.single.routes.map((route) => route.path), [
      'secure',
      'restricted',
      'sensitive',
      'api',
    ]);
  });

  testWidgets('the home screen shows the user of its scope', (tester) async {
    final screen = const ScenarioProbe().manifest().screens.single;
    final scope = TestScope(userId: 'user-1').scope;
    try {
      await tester.pumpWidget(TestApp().wrap(screen.builder(scope)));
      await tester.pumpAndSettle();

      expect(find.text(ScenarioProbe.userText('user-1')), findsOneWidget);
    } finally {
      await scope.dispose();
    }
  });

  testWidgets('the api screen names the mode and no client in demo', (
    tester,
  ) async {
    final screen = const ScenarioProbe()
        .manifest()
        .screens
        .single
        .routes
        .singleWhere((route) => route.path == 'api');
    final scope = TestScope().scope;
    try {
      await tester.pumpWidget(TestApp().wrap(screen.builder(scope)));
      await tester.pumpAndSettle();

      expect(find.text(ScenarioProbe.modeText(ShellMode.demo)), findsOneWidget);
      expect(find.textContaining('client:'), findsNothing);
    } finally {
      await scope.dispose();
    }
  });
}
