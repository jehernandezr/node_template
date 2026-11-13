import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart' show AppLocalizations;
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import '../l10n/generated/backoffice_localizations.dart';
import '../shared/constants/backoffice_access.dart';
import '../shared/constants/backoffice_paths.dart';
import '../shared/types/backoffice_types.dart';
import '../shared/utils/format_timestamp.dart';

/// Makes [BackofficeLocalizations] available to [child].
///
/// The shell does not register the backoffice delegate: the strings travel in
/// the deferred chunk and are added here, around each page and each dialog.
class BackofficeLocalized extends StatelessWidget {
  const BackofficeLocalized({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Localizations.override(
    context: context,
    delegates: const [BackofficeLocalizations.delegate],
    child: child,
  );
}

/// [showDialog] with the backoffice localizations. Dialogs live in the root
/// navigator, outside the page's [BackofficeLocalized].
Future<T?> showBackofficeDialog<T>({
  required BuildContext context,
  required WidgetBuilder builder,
}) => showDialog<T>(
  context: context,
  builder: (dialogContext) =>
      BackofficeLocalized(child: Builder(builder: builder)),
);

/// Frame of every backoffice page: its [AppPage] (the only top bar), the
/// section navigation, a subtitle and a content column.
class BackofficePage extends StatelessWidget {
  const BackofficePage({
    super.key,
    required this.title,
    required this.child,
    this.subtitle,
  });

  final String title;
  final String? subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final text = subtitle;
    return AppPage(
      title: title,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1100),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _SectionNav(),
                  const SizedBox(height: AppSpacing.md),
                  if (text != null) ...[
                    Text(
                      text,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                  ],
                  child,
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Links to the sections the session can read.
class _SectionNav extends StatelessWidget {
  const _SectionNav();

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    final operations = context.can(backofficeOperationsReadAccess);
    final items = [
      (label: l10n.navOverview, path: BackofficePaths.root),
      (label: l10n.navTenants, path: BackofficePaths.tenants),
      if (operations) (label: l10n.navSagas, path: BackofficePaths.sagas),
      if (operations) (label: l10n.navDlq, path: BackofficePaths.dlq),
    ];
    return Wrap(
      spacing: AppSpacing.sm,
      runSpacing: AppSpacing.xs,
      children: [
        for (final item in items)
          TextButton(
            onPressed: () => context.go(item.path),
            child: Text(item.label),
          ),
      ],
    );
  }
}

/// Shows [future] with [AsyncValueView]: loading, then an error view (with the
/// API code and trace id when there is one), then [builder] with the data.
class AsyncBody<T> extends StatelessWidget {
  const AsyncBody({
    super.key,
    required this.future,
    required this.builder,
    this.onRetry,
  });

  final Future<T> future;
  final Widget Function(BuildContext context, T data) builder;

  /// Loads again; the error view shows a retry button when set.
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) => FutureBuilder<T>(
    future: future,
    builder: (context, snapshot) {
      final shared = AppLocalizations.of(context);
      return AsyncValueView<T>(
        value: AsyncValue.fromSnapshot(snapshot),
        errorMessage: BackofficeLocalizations.of(context).loadError,
        onRetry: onRetry,
        retryLabel: shared.actionRetry,
        codeLabel: shared.errorCodeLabel,
        traceIdLabel: shared.errorTraceIdLabel,
        data: (data) => builder(context, data),
      );
    },
  );
}

/// Audit entries, most recent first, with the reason of manual actions.
class AuditTimeline extends StatelessWidget {
  const AuditTimeline({super.key, required this.entries});

  final List<AuditEntry> entries;

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    final theme = Theme.of(context);
    if (entries.isEmpty) {
      return EmptyState(icon: Icons.history, title: l10n.auditEmpty);
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final entry in entries)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${formatTimestamp(entry.occurredAt)} · ${entry.action}',
                    style: theme.textTheme.titleSmall,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text('${l10n.actor}: ${entry.actor}'),
                  Text('${l10n.entity}: ${entry.entity}'),
                  SelectableText(
                    '${l10n.traceId}: ${entry.traceId}',
                    style: theme.textTheme.labelSmall,
                  ),
                  if (entry.detail case final detail?)
                    Text(
                      detail,
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
