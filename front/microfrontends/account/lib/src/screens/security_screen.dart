import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../account_format.dart';
import '../data/account_models.dart';
import '../data/account_repository.dart';
import '../l10n/generated/account_localizations.dart';
import '../widgets/account_widgets.dart';
import '../widgets/step_up_dialog.dart';

/// MFA, passkeys y códigos de recuperación. Las acciones sensibles piden MFA.
class SecurityScreen extends StatefulWidget {
  const SecurityScreen({super.key, required this.repository});

  final AccountRepository repository;

  @override
  State<SecurityScreen> createState() => _SecurityScreenState();
}

class _SecurityScreenState extends State<SecurityScreen> {
  late Future<SecurityOverview> _overview = widget.repository.loadSecurity();

  void _reload() {
    setState(() {
      _overview = widget.repository.loadSecurity();
    });
  }

  Future<void> _addPasskey() async {
    final done = await runSensitiveAction(
      context,
      widget.repository,
      widget.repository.addPasskey,
      success: AccountLocalizations.of(context).passkeyAdded,
    );
    if (done && mounted) _reload();
  }

  Future<void> _regenerateCodes() async {
    final verified = await confirmStepUp(context, widget.repository);
    if (!verified || !mounted) return;
    List<String>? codes;
    final done = await runAccountAction(
      context,
      () async {
        codes = await widget.repository.regenerateRecoveryCodes();
      },
      success: AccountLocalizations.of(context).recoveryRegenerated,
    );
    final created = codes;
    if (done && created != null && mounted) {
      _reload();
      await _showCodes(created);
    }
  }

  Future<void> _showCodes(List<String> codes) {
    final l10n = AccountLocalizations.of(context);
    final shared = AppLocalizations.of(context);
    return showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(l10n.recoveryCodesTitle),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l10n.recoveryCodesNotice),
            const SizedBox(height: AppSpacing.sm),
            for (final code in codes)
              SelectableText(
                code,
                style: const TextStyle(fontFamily: 'monospace'),
              ),
          ],
        ),
        actions: [
          AppButton(
            label: shared.close,
            onPressed: () => Navigator.of(dialogContext).pop(),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: () => context.go('/account')),
        title: Text(AccountLocalizations.of(context).securityTitle),
      ),
      body: PlatformScreen(
        compact: (_) => AsyncView<SecurityOverview>(
          future: _overview,
          onRetry: _reload,
          builder: (context, overview) => _buildBody(context, overview),
        ),
      ),
    );
  }

  Widget _buildBody(BuildContext context, SecurityOverview overview) {
    final theme = Theme.of(context);
    final l10n = AccountLocalizations.of(context);
    final mfa = overview.mfa;
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l10n.mfaTitle, style: theme.textTheme.titleMedium),
              const SizedBox(height: AppSpacing.sm),
              Text(
                mfa.enabled
                    ? l10n.mfaEnabled(mfa.method ?? '')
                    : l10n.mfaDisabled,
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      l10n.passkeysTitle,
                      style: theme.textTheme.titleMedium,
                    ),
                  ),
                  AppButton(
                    label: l10n.passkeyAdd,
                    variant: AppButtonVariant.secondary,
                    onPressed: _addPasskey,
                  ),
                ],
              ),
              if (overview.passkeys.isEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: AppSpacing.sm),
                  child: Text(l10n.passkeysEmpty),
                ),
              for (final passkey in overview.passkeys)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(passkey.name),
                  subtitle: Text(
                    l10n.createdOnLabel(formatDate(passkey.createdAt)),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l10n.recoveryTitle, style: theme.textTheme.titleMedium),
              const SizedBox(height: AppSpacing.sm),
              Text(l10n.recoveryDescription),
              const SizedBox(height: AppSpacing.md),
              AppButton(
                label: l10n.recoveryRegenerate,
                variant: AppButtonVariant.secondary,
                onPressed: _regenerateCodes,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
