# tokens

Design tokens for the Flutter shells and microfrontends.

- `design-tokens.json` is the source of truth (color light/dark, spacing,
  radius, typography sizes). A future Style Dictionary build reads it to
  generate CSS and Dart.
- `lib/src/colors.dart`: `ColorPalette`, `AppColors.light` and `AppColors.dark`.
- `lib/src/scales.dart`: `AppSpacing`, `AppRadius` and `AppTypeScale`.

The Dart constants are hand-mirrored from the JSON. `test/tokens_test.dart`
parses the JSON and fails when any Dart value drifts from it. When you change
a token, change the JSON first and then the Dart constant.

```dart
import 'package:tokens/tokens.dart';

final padding = const EdgeInsets.all(AppSpacing.md);
final color = AppColors.light.brandPrimary;
```
