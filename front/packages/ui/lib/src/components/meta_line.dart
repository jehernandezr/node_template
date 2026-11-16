import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';

/// One line of secondary details, such as a platform and a date, joined with
/// the localized separator (`metaSeparator`) instead of a hand-typed dot.
///
/// The app must provide `AppLocalizations` from `i18n`.
class MetaLine extends StatelessWidget {
  /// Creates the line. With no [parts] it takes no space.
  const MetaLine({super.key, required this.parts, this.style});

  /// Already localized pieces, in display order.
  final List<String> parts;

  /// Text style. Defaults to the theme's `bodyMedium` in `onSurfaceVariant`.
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    if (parts.isEmpty) return const SizedBox.shrink();
    final theme = Theme.of(context);
    final separator = AppLocalizations.of(context).metaSeparator;
    return Text(
      parts.join(separator),
      style:
          style ??
          theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
    );
  }
}
