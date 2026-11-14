import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

import '../utils/pump.dart';

void main() {
  group(StatusColors, () {
    for (final (name, palette) in <(String, ColorPalette)>[
      ('light', AppColors.light),
      ('dark', AppColors.dark),
    ]) {
      test('$name palette maps each status role', () {
        final colors = StatusColors.fromPalette(palette);
        expect(colors.success, palette.successBase);
        expect(colors.onSuccess, palette.successOn);
        expect(colors.warning, palette.warningBase);
        expect(colors.onWarning, palette.warningOn);
        expect(colors.info, palette.infoBase);
        expect(colors.onInfo, palette.infoOn);
        expect(colors.onSuccessContainer, palette.textPrimary);
        expect(colors.onWarningContainer, palette.textPrimary);
        expect(colors.onInfoContainer, palette.textPrimary);
        expect(
          colors.successContainer,
          Color.alphaBlend(
            palette.successBase.withValues(alpha: 0.16),
            palette.surfaceRaised,
          ),
        );
      });
    }

    test('copyWith replaces the given role and keeps the others', () {
      final colors = StatusColors.fromPalette(AppColors.light);
      final copy = colors.copyWith(info: const Color(0xFF000000));
      expect(copy.info, const Color(0xFF000000));
      expect(copy.success, colors.success);
    });

    test(
      'lerp returns the endpoints at 0 and 1, and this when other is null',
      () {
        final light = StatusColors.fromPalette(AppColors.light);
        final dark = StatusColors.fromPalette(AppColors.dark);
        expect(light.lerp(dark, 0).success, isSameColorAs(light.success));
        expect(light.lerp(dark, 1).success, isSameColorAs(dark.success));
        expect(identical(light.lerp(null, 0.5), light), isTrue);
      },
    );

    test('the light and dark themes register StatusColors', () {
      expect(AppTheme.light().extension<StatusColors>(), isNotNull);
      expect(AppTheme.dark().extension<StatusColors>(), isNotNull);
    });

    testWidgets('the context reads the status roles of the theme', (
      tester,
    ) async {
      StatusColors? read;
      await pumpApp(
        tester,
        Builder(
          builder: (context) {
            read = context.statusColors;
            return const SizedBox();
          },
        ),
      );
      expect(read?.success, AppColors.light.successBase);
    });

    final pairs =
        <(String, Color Function(StatusColors), Color Function(StatusColors))>[
          ('success', (c) => c.success, (c) => c.onSuccess),
          ('warning', (c) => c.warning, (c) => c.onWarning),
          ('info', (c) => c.info, (c) => c.onInfo),
          (
            'successContainer',
            (c) => c.successContainer,
            (c) => c.onSuccessContainer,
          ),
          (
            'warningContainer',
            (c) => c.warningContainer,
            (c) => c.onWarningContainer,
          ),
          ('infoContainer', (c) => c.infoContainer, (c) => c.onInfoContainer),
        ];

    for (final dark in [false, true]) {
      for (final (name, background, foreground) in pairs) {
        testWidgets('$name contrast ${dark ? 'dark' : 'light'}', (
          tester,
        ) async {
          final handle = tester.ensureSemantics();
          final theme = dark ? AppTheme.dark() : AppTheme.light();
          final colors = theme.extension<StatusColors>()!;
          await tester.pumpWidget(
            MaterialApp(
              theme: theme,
              home: Scaffold(
                body: Container(
                  color: background(colors),
                  padding: const EdgeInsetsDirectional.all(AppSpacing.sm),
                  child: Text(
                    'Texto de ejemplo',
                    style: TextStyle(color: foreground(colors)),
                  ),
                ),
              ),
            ),
          );
          await expectLater(tester, meetsGuideline(textContrastGuideline));
          handle.dispose();
        });
      }
    }
  });
}
