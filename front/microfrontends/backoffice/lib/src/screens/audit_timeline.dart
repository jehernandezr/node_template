import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart' show formatDateTime;

import '../l10n/generated/backoffice_localizations.dart';
import '../shared/types/backoffice_types.dart';

/// Audit entries as a sliver, most recent first as given, with the reason of
/// manual actions. Rows are built lazily.
class AuditTimeline extends StatelessWidget {
  /// Timeline of [entries], newest first.
  const AuditTimeline({super.key, required this.entries});

  /// Audit entries shown.
  final List<AuditEntry> entries;

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    if (entries.isEmpty) {
      return SliverToBoxAdapter(
        child: EmptyState(icon: Icons.history, title: l10n.auditEmpty),
      );
    }
    return SliverList.separated(
      itemCount: entries.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (context, index) => _AuditEntryCard(entry: entries[index]),
    );
  }
}

class _AuditEntryCard extends StatelessWidget {
  const _AuditEntryCard({required this.entry});

  final AuditEntry entry;

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    final theme = Theme.of(context);
    final detail = entry.detail;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MetaLine(
            parts: [
              formatDateTime(entry.occurredAt, locale: context.localeTag),
              entry.action,
            ],
            style: theme.textTheme.titleSmall,
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(l10n.auditActorLine(entry.actor)),
          Text(l10n.auditEntityLine(entry.entity)),
          SelectableText(
            l10n.traceIdLine(entry.traceId),
            style: theme.textTheme.labelSmall,
          ),
          if (detail != null)
            Text(
              detail,
              style: theme.textTheme.bodySmall?.copyWith(
                fontStyle: FontStyle.italic,
              ),
            ),
        ],
      ),
    );
  }
}
