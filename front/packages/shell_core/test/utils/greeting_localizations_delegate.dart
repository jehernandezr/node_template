import 'package:flutter/foundation.dart';
import 'package:material_ui/material_ui.dart';

import 'greeting_localizations.dart';

/// Delegate that answers synchronously, as a loaded library does.
final class GreetingLocalizationsDelegate
    extends LocalizationsDelegate<GreetingLocalizations> {
  @override
  bool isSupported(Locale locale) => true;

  @override
  Future<GreetingLocalizations> load(Locale locale) =>
      SynchronousFuture(const GreetingLocalizations('Hello'));

  @override
  bool shouldReload(LocalizationsDelegate<GreetingLocalizations> old) => false;
}
