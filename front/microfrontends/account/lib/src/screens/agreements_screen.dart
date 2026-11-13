import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/account_repository.dart';
import '../l10n/generated/account_localizations.dart';
import '../shared/enums/account_enums.dart';
import '../shared/types/account_types.dart';
import '../shared/utils/account_format.dart';
import '../shared/utils/account_paths.dart';
import '../widgets/account_widgets.dart';

typedef _Agreements = ({List<Agreement> pending, List<Agreement> accepted});

/// Acuerdos pendientes de aceptar e historial de los aceptados.
class AgreementsScreen extends StatefulWidget {
  const AgreementsScreen({super.key, required this.repository});

  final AccountRepository repository;

  @override
  State<AgreementsScreen> createState() => _AgreementsScreenState();
}

class _AgreementsScreenState extends State<AgreementsScreen> {
  AsyncValue<_Agreements> _agreements = const AsyncValue.loading();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<_Agreements> _fetch() async {
    final pending = await widget.repository.listPendingAgreements();
    final accepted = await widget.repository.listAcceptedAgreements();
    return (pending: pending, accepted: accepted);
  }

  Future<void> _load() async {
    final result = await AsyncValue.guard(_fetch);
    if (!mounted) return;
    setState(() => _agreements = result);
  }

  void _reload() {
    setState(() => _agreements = const AsyncValue.loading());
    _load();
  }

  Future<void> _review(Agreement agreement) async {
    final l10n = AccountLocalizations.of(context);
    final shared = AppLocalizations.of(context);
    final accepted = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(agreement.title),
        content: Text(
          '${l10n.versionLabel(agreement.version)}. ${l10n.reviewNotice}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(shared.actionCancel),
          ),
          AppButton(
            label: l10n.accept,
            onPressed: () => Navigator.of(dialogContext).pop(true),
          ),
        ],
      ),
    );
    if (accepted != true || !mounted) return;
    final done = await runAccountAction(
      context,
      () => widget.repository.acceptAgreement(agreement.id),
      success: () => l10n.agreementAccepted,
    );
    if (done && mounted) _reload();
  }

  @override
  Widget build(BuildContext context) {
    return AppPage(
      title: AccountLocalizations.of(context).agreementsTitle,
      onBack: () => context.go(accountPath(AccountSection.overview)),
      body: PlatformScreen(
        compact: (_) => AccountAsyncView<_Agreements>(
          value: _agreements,
          onRetry: _reload,
          data: (data) => _buildBody(context, data),
        ),
      ),
    );
  }

  Widget _buildBody(BuildContext context, _Agreements data) {
    final theme = Theme.of(context);
    final l10n = AccountLocalizations.of(context);
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: [
        Text(l10n.pendingSection, style: theme.textTheme.titleMedium),
        if (data.pending.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
            child: EmptyState(
              icon: Icons.check_circle_outline,
              title: l10n.pendingEmptyTitle,
            ),
          ),
        for (final agreement in data.pending)
          Padding(
            padding: const EdgeInsets.only(top: AppSpacing.sm),
            child: AccountRowCard(
              title: agreement.title,
              subtitle: _pendingDetail(context, agreement),
              trailing: AppButton(
                label: l10n.reviewAndAccept,
                onPressed: () => _review(agreement),
              ),
            ),
          ),
        const SizedBox(height: AppSpacing.md),
        Text(l10n.acceptedSection, style: theme.textTheme.titleMedium),
        if (data.accepted.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
            child: Text(l10n.acceptedEmptyMessage),
          ),
        for (final agreement in data.accepted)
          Padding(
            padding: const EdgeInsets.only(top: AppSpacing.sm),
            child: AccountRowCard(
              title: agreement.title,
              subtitle: _acceptedDetail(context, agreement),
            ),
          ),
      ],
    );
  }

  String _pendingDetail(BuildContext context, Agreement agreement) {
    final l10n = AccountLocalizations.of(context);
    final kind = agreement.required ? l10n.requiredLabel : l10n.optionalLabel;
    final grace = agreement.graceUntil;
    final base = '${l10n.versionLabel(agreement.version)} · $kind';
    if (grace == null) return base;
    return '$base · ${l10n.deadlineLabel(formatDate(grace))}';
  }

  String _acceptedDetail(BuildContext context, Agreement agreement) {
    final l10n = AccountLocalizations.of(context);
    final at = agreement.acceptedAt;
    final base = l10n.versionLabel(agreement.version);
    if (at == null) return base;
    return '$base · ${l10n.acceptedOnLabel(formatDate(at))}';
  }
}
