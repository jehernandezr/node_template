import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

void main() {
  test('design tokens are reachable through the ui import', () {
    expect(AppSpacing.md, 16);
    expect(AppRadius.md, 8);
    expect(AppTypeScale.body, 14);
    expect(AppColors.light.brandPrimary, isNotNull);
  });
}
