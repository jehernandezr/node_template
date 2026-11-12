import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/account_repository.dart';
import '../l10n/generated/account_localizations.dart';
import 'account_widgets.dart';

/// Pide el código MFA del paso adicional. Devuelve true si el código es válido.
Future<bool> confirmStepUp(
  BuildContext context,
  AccountRepository repository,
) async {
  final verified = await showDialog<bool>(
    context: context,
    builder: (_) => _StepUpDialog(repository: repository),
  );
  return verified ?? false;
}

/// Confirma con MFA y, si pasa, ejecuta [action]. Devuelve true si se completó.
Future<bool> runSensitiveAction(
  BuildContext context,
  AccountRepository repository,
  Future<void> Function() action, {
  required String success,
}) async {
  final verified = await confirmStepUp(context, repository);
  if (!verified || !context.mounted) return false;
  return runAccountAction(context, action, success: success);
}

class _StepUpDialog extends StatefulWidget {
  const _StepUpDialog({required this.repository});

  final AccountRepository repository;

  @override
  State<_StepUpDialog> createState() => _StepUpDialogState();
}

class _StepUpDialogState extends State<_StepUpDialog> {
  final TextEditingController _controller = TextEditingController();
  String? _error;
  bool _checking = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AccountLocalizations.of(context);
    final code = _controller.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      setState(() => _error = l10n.stepUpIncomplete);
      return;
    }
    setState(() {
      _checking = true;
      _error = null;
    });
    final valid = await widget.repository.verifyStepUpCode(code);
    if (!mounted) return;
    if (valid) {
      Navigator.of(context).pop(true);
    } else {
      setState(() {
        _checking = false;
        _error = l10n.stepUpInvalid;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AccountLocalizations.of(context);
    final shared = AppLocalizations.of(context);
    return AlertDialog(
      title: Text(l10n.stepUpTitle),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l10n.stepUpMessage),
          const SizedBox(height: AppSpacing.md),
          TextField(
            controller: _controller,
            autofocus: true,
            keyboardType: TextInputType.number,
            maxLength: 6,
            decoration: InputDecoration(
              labelText: l10n.stepUpCodeLabel,
              errorText: _error,
            ),
            onSubmitted: (_) => _submit(),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _checking ? null : () => Navigator.of(context).pop(false),
          child: Text(shared.actionCancel),
        ),
        AppButton(
          label: shared.confirm,
          loading: _checking,
          onPressed: _submit,
        ),
      ],
    );
  }
}
