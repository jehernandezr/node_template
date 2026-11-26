import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart' show AppLocalizations;
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart' show formatDateTime;

import '../data/backoffice_repository.dart';
import '../l10n/generated/backoffice_localizations.dart';
import '../shared/constants/backoffice_access.dart';
import '../shared/constants/backoffice_paths.dart';
import '../shared/types/backoffice_types.dart';
import 'async_sliver.dart';
import 'backoffice_page.dart';
import 'dlq_controller.dart';
import 'sliver_gap.dart';

/// Dead-letter queues with their counts. Opening a queue goes to
/// `/backoffice/dlq/:queue` and lists its messages; redrive moves them back to
/// the source queue after confirmation, and only `superAdmin` and `support`
/// see it.
class DlqScreen extends StatelessWidget {
  /// Dead-letter queues screen backed by [repository], opened on [queue] when given.
  const DlqScreen({super.key, required this.repository, this.queue});

  /// Data source of the screen.
  final BackofficeRepository repository;

  /// Queue whose messages are listed, or null to show only the queues.
  final String? queue;

  @override
  Widget build(BuildContext context) => ControllerBuilder<DlqController>(
    create: (_) => DlqController(repository, queue: queue)..start(),
    builder: (context, controller) {
      final l10n = BackofficeLocalizations.of(context);
      return BackofficePage(
        title: l10n.dlqTitle,
        subtitle: l10n.dlqSubtitle,
        slivers: [
          AsyncSliver<List<DeadLetterQueue>>(
            value: controller.queues,
            onRetry: controller.reloadQueues,
            data: (queues) => queues.isEmpty
                ? [
                    SliverToBoxAdapter(
                      child: EmptyState(
                        icon: Icons.inbox_outlined,
                        title: l10n.dlqEmpty,
                      ),
                    ),
                  ]
                : [
                    SliverList.separated(
                      itemCount: queues.length,
                      separatorBuilder: (_, _) =>
                          const SizedBox(height: AppSpacing.sm),
                      itemBuilder: (context, index) => _QueueTile(
                        queue: queues[index],
                        isSelected: queues[index].name == controller.queue,
                      ),
                    ),
                  ],
          ),
          const SliverGap(AppSpacing.md),
          _QueueMessages(controller: controller),
        ],
      );
    },
  );
}

class _QueueTile extends StatelessWidget {
  const _QueueTile({required this.queue, required this.isSelected});

  final DeadLetterQueue queue;
  final bool isSelected;

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Semantics(
      selected: isSelected,
      child: AppCard(
        key: ValueKey('dlq-queue-${queue.name}'),
        onTap: () => context.go(BackofficePaths.dlqQueue(queue.name)),
        child: Row(
          children: [
            Expanded(
              child: Text(
                queue.name,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ),
            if (isSelected) ...[
              Icon(Icons.check_circle, color: scheme.primary),
              const SizedBox(width: AppSpacing.sm),
            ],
            Flexible(
              child: Text(
                l10n.dlqMessagesCount(queue.messageCount),
                textAlign: TextAlign.end,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QueueMessages extends StatelessWidget {
  const _QueueMessages({required this.controller});

  final DlqController controller;

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    final queue = controller.queue;
    final messages = controller.messages;
    if (queue == null || messages == null) {
      return SliverToBoxAdapter(
        child: EmptyState(
          icon: Icons.touch_app_outlined,
          title: l10n.dlqSelectQueue,
        ),
      );
    }
    return AsyncSliver<List<DeadLetterMessage>>(
      value: messages,
      onRetry: controller.reloadMessages,
      data: (list) => [
        SliverToBoxAdapter(
          child: Row(
            children: [
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text(
                    l10n.dlqMessagesHeading(queue),
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
              ),
              AccessGate(
                rule: backofficeOperationsWriteAccess,
                child: FilledButton(
                  key: const Key('dlq-redrive'),
                  onPressed: list.isEmpty || controller.isBusy
                      ? null
                      : () => _redrive(context, queue, list.length),
                  child: Text(l10n.dlqRedrive),
                ),
              ),
            ],
          ),
        ),
        const SliverGap(AppSpacing.sm),
        if (list.isEmpty)
          SliverToBoxAdapter(
            child: EmptyState(
              icon: Icons.check_circle_outline,
              title: l10n.dlqMessagesEmpty,
            ),
          )
        else
          SliverList.separated(
            itemCount: list.length,
            separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (context, index) => _MessageCard(message: list[index]),
          ),
      ],
    );
  }

  Future<void> _redrive(BuildContext context, String queue, int count) async {
    final confirmed = await context.showLocalizedDialog<bool>(
      builder: (dialogContext) {
        final l10n = BackofficeLocalizations.of(dialogContext);
        final shared = AppLocalizations.of(dialogContext);
        return AlertDialog(
          title: Text(l10n.dlqRedriveTitle),
          content: Text(l10n.dlqRedriveConfirm(count, queue)),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: Text(shared.actionCancel),
            ),
            FilledButton(
              key: const Key('dlq-redrive-confirm'),
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: Text(l10n.dlqRedrive),
            ),
          ],
        );
      },
    );
    if (confirmed != true || !context.mounted) return;
    final result = await controller.redrive();
    if (!context.mounted) return;
    final l10n = BackofficeLocalizations.of(context);
    showActionResult(
      context,
      result,
      success: switch (result) {
        ActionSucceeded<int>(:final value) => l10n.dlqRedriveDone(value),
        ActionFailed<int>() || ActionSkipped<int>() => null,
      },
    );
  }
}

class _MessageCard extends StatelessWidget {
  const _MessageCard({required this.message});

  final DeadLetterMessage message;

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.dlqMessageTypeLine(message.type),
            style: Theme.of(context).textTheme.titleSmall,
          ),
          Text(l10n.dlqFirstErrorLine(message.firstError)),
          Text(l10n.dlqReceiveCount(message.receiveCount)),
          Text(
            l10n.dlqSentAtLine(
              formatDateTime(message.sentAt, locale: context.localeTag),
            ),
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}
