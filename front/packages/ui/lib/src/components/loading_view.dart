import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:tokens/tokens.dart';

/// Centered spinner with an optional [message] below it.
///
/// The spinner is labeled with the shared loading text when
/// [AppLocalizations] is installed.
class LoadingView extends StatelessWidget {
  /// Creates a loading view.
  const LoadingView({super.key, this.message});

  /// Text shown under the spinner.
  final String? message;

  /// The label comes from the indicator; repeating it here would be read twice. `container` keeps the live region to this view instead of the whole page.
  @override
  Widget build(BuildContext context) {
    final text = message;
    final label = Localizations.of<AppLocalizations>(
      context,
      AppLocalizations,
    )?.loading;
    return Semantics(
      container: true,
      liveRegion: true,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(semanticsLabel: label),
            if (text != null) ...[
              const SizedBox(height: AppSpacing.md),
              Text(text, textAlign: TextAlign.center),
            ],
          ],
        ),
      ),
    );
  }
}
