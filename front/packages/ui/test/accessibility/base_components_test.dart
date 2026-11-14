import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

import '../utils/accessibility.dart';
import '../utils/pump.dart';

void main() {
  final widgets = <String, Widget Function()>{
    'primary button': () => AppButton(label: 'Guardar', onPressed: () {}),
    'secondary button': () => AppButton(
      label: 'Guardar',
      onPressed: () {},
      variant: AppButtonVariant.secondary,
    ),
    'danger button': () => AppButton(
      label: 'Eliminar',
      onPressed: () {},
      variant: AppButtonVariant.danger,
    ),
    'loading button': () =>
        AppButton(label: 'Guardar', onPressed: () {}, loading: true),
    'tappable card': () => AppCard(onTap: () {}, child: const Text('Abrir')),
    'empty state': () => EmptyState(
      icon: Icons.inbox,
      title: 'Sin datos',
      message: 'Aún no hay nada',
      actionLabel: 'Crear',
      onAction: () {},
    ),
    'loading view': () => const LoadingView(),
    'error view': () => ErrorView(
      message: 'No se pudo cargar',
      code: 'PLATFORM.INTERNAL',
      traceId: 'trace-1',
      onRetry: () {},
    ),
  };

  final themes = <String, ThemeData Function()>{
    'light': AppTheme.light,
    'dark': AppTheme.dark,
  };

  for (final entry in widgets.entries) {
    for (final theme in themes.entries) {
      testWidgets('${entry.key} meets the guidelines in the ${theme.key} '
          'theme', (tester) async {
        final handle = tester.ensureSemantics();
        setSurface(tester, 400);
        await pumpApp(tester, entry.value(), theme: theme.value());
        await expectMeetsGuidelines(tester);
        handle.dispose();
      });
    }

    testWidgets('${entry.key} survives text scale 2', (tester) async {
      setSurface(tester, 400);
      useTextScale(tester, 2);
      await pumpApp(tester, entry.value());
      expect(tester.takeException(), isNull);
    });
  }
}
