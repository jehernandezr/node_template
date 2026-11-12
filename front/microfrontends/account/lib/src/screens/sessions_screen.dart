import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../account_format.dart';
import '../data/account_models.dart';
import '../data/account_repository.dart';
import '../l10n/generated/account_localizations.dart';
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
  late Future<List<AppSession>> _sessions = widget.repository.listSessions();

  void _reload() {
    setState(() {
      _sessions = widget.repository.listSessions();
    });
  }

  Future<void> _closeSession(AppSession session) async {
    final done = await runAccountAction(
      context,
      () => widget.repository.revokeSession(session.id),
      success: AccountLocalizations.of(context).sessionClosed,
    );
    if (done && mounted) _reload();
  }

  Future<void> _closeOthers() async {
    final verified = await confirmStepUp(context, widget.repository);
    if (!verified || !mounted) return;
    final l10n = AccountLocalizations.of(context);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final closed = await widget.repository.revokeOtherSessions();
      messenger.showSnackBar(SnackBar(content: Text(l10n.othersClosed(closed))));
      if (mounted) _reload();
    } catch (_) {
      messenger.showSnackBar(SnackBar(content: Text(l10n.actionFailed)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: () => context.go('/account')),
        title: Text(AccountLocalizations.of(context).sessionsTitle),
      ),
      body: PlatformScreen(
        compact: (_) => AsyncView<List<AppSession>>(
          future: _sessions,
          onRetry: _reload,
          builder: (context, sessions) => _buildList(context, sessions),
        ),
      ),
    );
  }

  Widget _buildList(BuildContext context, List<AppSession> sessions) {
    final l10n = AccountLocalizations.of(context);
    if (sessions.isEmpty) {
      return EmptyState(
        icon: Icons.devices_outlined,
        title: l10n.sessionsEmptyTitle,
        message: l10n.sessionsEmptyMessage,
      );
    }
    final hasOthers = sessions.any((session) => !session.isCurrent);
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
                  '${session.platform} · ${l10n.lastSeenLabel(formatDateTime(session.lastSeen))}',
              trailing: session.isCurrent
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
