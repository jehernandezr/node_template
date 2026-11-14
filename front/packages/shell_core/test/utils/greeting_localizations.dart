import 'package:material_ui/material_ui.dart';

/// Texts of a fake deferred library, found through its delegate.
final class GreetingLocalizations {
  const GreetingLocalizations(this.greeting);

  final String greeting;

  static GreetingLocalizations of(BuildContext context) =>
      Localizations.of<GreetingLocalizations>(context, GreetingLocalizations)!;
}
