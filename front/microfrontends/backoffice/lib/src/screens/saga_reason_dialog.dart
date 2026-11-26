import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../l10n/backoffice_labels.dart';
import '../l10n/generated/backoffice_localizations.dart';
import '../shared/enums/backoffice_enums.dart';

/// Asks for the reason of a manual saga action. Pops with the trimmed reason,
/// or with null when the operator cancels.
class SagaReasonDialog extends StatefulWidget {
  /// Dialog that asks for the reason of [action].
  const SagaReasonDialog({super.key, required this.action});

  /// Action the reason is given for.
  final SagaManualAction action;

  @override
  State<SagaReasonDialog> createState() => _SagaReasonDialogState();
}

class _SagaReasonDialogState extends State<SagaReasonDialog> {
  final TextEditingController _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    final shared = AppLocalizations.of(context);
    final reason = _controller.text.trim();
    return AlertDialog(
      title: Text(manualActionLabel(l10n, widget.action)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l10n.reasonHelp),
          const SizedBox(height: AppSpacing.md),
          TextField(
            key: const Key('saga-reason-field'),
            controller: _controller,
            autofocus: true,
            minLines: 2,
            maxLines: 4,
            textInputAction: TextInputAction.newline,
            decoration: InputDecoration(labelText: l10n.reasonLabel),
            onChanged: (_) => setState(() {}),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(shared.actionCancel),
        ),
        FilledButton(
          key: const Key('saga-reason-confirm'),
          onPressed: reason.isEmpty
              ? null
              : () => Navigator.of(context).pop(reason),
          child: Text(shared.confirm),
        ),
      ],
    );
  }
}
