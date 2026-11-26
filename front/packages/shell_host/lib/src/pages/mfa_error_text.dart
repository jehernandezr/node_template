import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

/// Message of the last error of a flow, or nothing. Announced as it appears,
/// so a failed code is heard without moving focus.
class MfaErrorText extends StatelessWidget {
  /// Shows the message of the error [code], if any.
  const MfaErrorText({super.key, required this.textKey, required this.code});

  /// Key of the text, for tests.
  final Key textKey;

  /// Error code to explain, or `null` for none.
  final String? code;

  @override
  Widget build(BuildContext context) {
    final errorCode = code;
    if (errorCode == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.md),
      child: Semantics(
        liveRegion: true,
        container: true,
        child: Text(
          errorMessage(AppLocalizations.of(context), errorCode),
          key: textKey,
          textAlign: TextAlign.center,
          style: TextStyle(color: Theme.of(context).colorScheme.error),
        ),
      ),
    );
  }
}
