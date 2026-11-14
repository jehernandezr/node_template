import 'package:material_ui/material_ui.dart';

/// The language tag of the current locale.
extension LocaleTagContext on BuildContext {
  /// BCP 47 tag of the locale in use, such as `es` or `en-US`, for the
  /// formatters of `utils`.
  String get localeTag => Localizations.localeOf(this).toLanguageTag();
}
