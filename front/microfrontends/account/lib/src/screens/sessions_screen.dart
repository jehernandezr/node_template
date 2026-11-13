import 'package:contracts/contracts.dart' show SessionSummary;
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/account_repository.dart';
import '../l10n/generated/account_localizations.dart';
import '../shared/enums/account_enums.dart';
import '../shared/utils/account_format.dart';
import '../shared/utils/account_paths.dart';
import '../widgets/account_labels.dart';
import '../widgets/account_widgets.dart';
import '../widgets/step_up_dialog.dart';

/// Sesiones activas con cierre remoto.
class SessionsScreen extends StatefulWidget {
  const SessionsScreen({super.key, required this.repository});

  final AccountRepository repository;

  @override
  State<SessionsScreen> createState() => _SessionsScreenState();
}

class _SessionsScreenState extends State<SessionsScreen> {
  AsyncValue<List<SessionSummary>> _sessions = const AsyncValue.loading();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final result = await AsyncValue.guard(widget.repository.listSessions);
    if (!mounted) return;
    setState(() => _sessions = result);
  }

  void _reload() {
    setState(() => _sessions = const AsyncValue.loading());
    _load();
  }

  Future<void> _closeSession(SessionSummary session) async {
    final l10n = AccountLocalizations.of(context);
    final done = await runAccountAction(
      context,
      () => widget.repository.revokeSession(session.id),
      success: () => l10n.sessionClosed,
    );
    if (done && mounted) _reload();
  }

  Future<void> _closeOthers() async {
    final l10n = AccountLocalizations.of(context);
    final verified = await confirmStepUp(context, widget.repository);
    if (!verified || !mounted) return;
    var closed = 0;
    final done = await runAccountAction(
      context,
      () async => closed = await widget.repository.revokeOtherSessions(),
      success: () => l10n.othersClosed(closed),
    );
    if (done && mounted) _reload();
  }

  @override
  Widget build(BuildContext context) {
    return AppPage(
      title: AccountLocalizations.of(context).sessionsTitle,
      onBack: () => context.go(accountPath(AccountSection.overview)),
      body: PlatformScreen(
        compact: (_) => AccountAsyncView<List<SessionSummary>>(
          value: _sessions,
          onRetry: _reload,
          data: (sessions) => _buildList(context, sessions),
        ),
      ),
    );
  }

  Widget _buildList(BuildContext context, List<SessionSummary> sessions) {
    final l10n = AccountLocalizations.of(context);
    if (sessions.isEmpty) {
      return EmptyState(
        icon: Icons.devices_outlined,
        title: l10n.sessionsEmptyTitle,
        message: l10n.sessionsEmptyMessage,
      );
    }
    final hasOthers = sessions.any((session) => !session.current);
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: [
        if (hasOthers)
          Align(
            alignment: Alignment.centerRight,
            child: AppButton(
              label: l10n.sessionsCloseOthers,
              variant: AppButtonVariant.secondary,
              onPressed: _closeOthers,
            ),
          ),
        for (final session in sessions)
          Padding(
            padding: const EdgeInsets.only(top: AppSpacing.sm),
            child: AccountRowCard(
              title: session.deviceName,
              subtitle:
                  '${platformLabel(l10n, session.platform)} · ${l10n.lastSeenLabel(formatDateTime(session.lastSeenAt))}',
              trailing: session.current
                  ? StatusBadge(label: l10n.sessionCurrent)
                  : AppButton(
                      label: l10n.sessionClose,
                      variant: AppButtonVariant.secondary,
                      onPressed: () => _closeSession(session),
                    ),
            ),
          ),
      ],
    );
  }
}
