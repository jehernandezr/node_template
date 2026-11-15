import 'package:contracts/contracts.dart' show SessionSummary;
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart' show formatDateTime;

import '../data/account_repository.dart';
import '../l10n/account_labels.dart';
import '../l10n/generated/account_localizations.dart';
import '../shared/constants/account_access.dart';
import '../shared/enums/account_enums.dart';
import '../shared/utils/account_paths.dart';
import 'sessions_controller.dart';
import 'step_up_gate.dart';
import 'widgets/account_widgets.dart';

/// Active sessions with remote sign-out.
class SessionsScreen extends StatelessWidget {
  const SessionsScreen({
    super.key,
    required this.repository,
    required this.requestStepUp,
  });

  final AccountRepository repository;

  /// The shell's step-up, for closing every other session.
  final Future<bool> Function() requestStepUp;

  @override
  Widget build(BuildContext context) => ControllerBuilder<SessionsController>(
    create: (context) => SessionsController(
      repository,
      stepUp: StepUpGate.fromContext(
        context,
        rule: accountStepUpRule,
        request: requestStepUp,
      ),
    )..start(),
    builder: (context, controller) => AppPage(
      title: AccountLocalizations.of(context).sessionsTitle,
      onBack: () => context.go(accountPath(AccountSection.overview)),
      body: AsyncValueView<List<SessionSummary>>(
        value: controller.sessions,
        errorMessage: AccountLocalizations.of(context).loadError,
        onRetry: controller.start,
        data: (sessions) => _SessionsList(
          sessions: sessions,
          onClose: (id) async {
            final result = await controller.closeSession(id);
            if (!context.mounted) return;
            final l10n = AccountLocalizations.of(context);
            showActionResult(
              context,
              result,
              success: l10n.sessionClosed,
              failure: l10n.actionFailed,
            );
          },
          onCloseOthers: () async {
            final result = await controller.closeOthers();
            if (!context.mounted) return;
            final l10n = AccountLocalizations.of(context);
            showActionResult(
              context,
              result,
              success: switch (result) {
                ActionSucceeded<int>(:final value) => l10n.othersClosed(value),
                ActionFailed<int>() || ActionSkipped<int>() => null,
              },
              failure: l10n.actionFailed,
            );
          },
        ),
      ),
    ),
  );
}

class _SessionsList extends StatelessWidget {
  const _SessionsList({
    required this.sessions,
    required this.onClose,
    required this.onCloseOthers,
  });

  final List<SessionSummary> sessions;
  final ValueChanged<String> onClose;
  final VoidCallback onCloseOthers;

  @override
  Widget build(BuildContext context) {
    final l10n = AccountLocalizations.of(context);
    if (sessions.isEmpty) {
      return EmptyState(
        icon: Icons.devices_outlined,
        title: l10n.sessionsEmptyTitle,
        message: l10n.sessionsEmptyMessage,
      );
    }
    final hasOthers = sessions.any((session) => !session.current);
    return ContentColumn(
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          if (hasOthers)
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: AppButton(
                label: l10n.sessionsCloseOthers,
                variant: AppButtonVariant.secondary,
                onPressed: onCloseOthers,
              ),
            ),
          for (final session in sessions)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.sm),
              child: AccountRowCard(
                title: session.deviceName,
                details: [
                  platformLabel(l10n, session.platform),
                  l10n.lastSeenLabel(
                    formatDateTime(
                      session.lastSeenAt,
                      locale: context.localeTag,
                    ),
                  ),
                ],
                trailing: session.current
                    ? StatusBadge(label: l10n.sessionCurrent)
                    : AppButton(
                        label: l10n.sessionClose,
                        variant: AppButtonVariant.secondary,
                        onPressed: () => onClose(session.id),
                      ),
              ),
            ),
        ],
      ),
    );
  }
}
