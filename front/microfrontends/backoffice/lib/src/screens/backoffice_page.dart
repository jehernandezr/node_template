import 'package:contracts/contracts.dart';
import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart' show AppLocalizations, errorMessage;
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/backoffice_models.dart';
import '../l10n/generated/backoffice_localizations.dart';
import '../labels.dart';

/// Shows an API error of a manual action in a SnackBar: the localized message
/// of its code, followed by the code itself.
void showActionError(BuildContext context, ApiErrorException error) {
  final shared = AppLocalizations.of(context);
  final code = error.problem.code;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text('${errorMessage(shared, code)} (${shared.errorCodeLabel}: $code)'),
    ),
  );
}

/// Frame of every backoffice page: its own app bar, the section navigation,
/// a subtitle and a content column.
///
/// Pass [backPath] on detail pages to show a back button in the app bar.
class BackofficePage extends StatelessWidget {
  const BackofficePage({
    super.key,
    required this.title,
    required this.child,
    this.subtitle,
    this.backPath,
  });

  final String title;
  final String? subtitle;
  final String? backPath;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final back = backPath;
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        leading: back == null
            ? null
            : IconButton(
                tooltip: AppLocalizations.of(context).back,
                icon: const Icon(Icons.arrow_back),
                onPressed: () => context.go(back),
              ),
      ),
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
                  if (subtitle != null) ...[
                    Text(
                      subtitle!,
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

class _SectionNav extends StatelessWidget {
  const _SectionNav();

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    final items = [
      (label: l10n.navOverview, path: '/backoffice'),
      (label: l10n.navTenants, path: '/backoffice/tenants'),
      (label: l10n.navSagas, path: '/backoffice/sagas'),
      (label: l10n.navDlq, path: '/backoffice/dlq'),
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

/// Shows a loading view, then an error view (with the API code when there is one),
/// then [builder] with the loaded data.
class AsyncBody<T> extends StatelessWidget {
  const AsyncBody({super.key, required this.future, required this.builder});

  final Future<T> future;
  final Widget Function(BuildContext context, T data) builder;

  @override
  Widget build(BuildContext context) => FutureBuilder<T>(
    future: future,
    builder: (context, snapshot) {
      if (snapshot.hasError) {
        final shared = AppLocalizations.of(context);
        return ErrorView.fromException(
          snapshot.error!,
          fallbackMessage: BackofficeLocalizations.of(context).loadError,
          codeLabel: shared.errorCodeLabel,
          traceIdLabel: shared.errorTraceIdLabel,
          retryLabel: shared.actionRetry,
        );
      }
      if (!snapshot.hasData) {
        return const LoadingView();
      }
      return builder(context, snapshot.requireData);
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
                  if (entry.detail != null)
                    Text(
                      entry.detail!,
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
