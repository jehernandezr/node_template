import 'package:contracts/contracts.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import 'mfa_method_labels.dart';

/// One button per offered method. Disabled while [busy].
class MfaMethodPicker extends StatelessWidget {
  /// List of [methods] the user picks from with [onPick].
  const MfaMethodPicker({
    super.key,
    required this.methods,
    required this.busy,
    required this.onPick,
  });

  /// Methods on offer.
  final List<MfaFactor> methods;

  /// Whether a request is in flight.
  final bool busy;

  /// Called with the picked method.
  final ValueChanged<MfaFactor> onPick;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(l10n.mfaChooseMethod, textAlign: TextAlign.center),
        const SizedBox(height: AppSpacing.md),
        for (final method in methods)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: AppButton(
              label: MfaMethodLabels.of(l10n, method),
              variant: AppButtonVariant.secondary,
              onPressed: busy ? null : () => onPick(method),
            ),
          ),
      ],
    );
  }
}
