import 'package:go_router/go_router.dart';
import 'package:contracts/contracts.dart';
import 'package:i18n/i18n.dart' show AppLocalizations;
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/backoffice_models.dart';
import '../data/backoffice_repository.dart';
import '../l10n/generated/backoffice_localizations.dart';
import '../labels.dart';
import 'backoffice_page.dart';

/// Dead-letter queues with their counts. Opening a queue goes to `/backoffice/dlq/:queue`
/// and lists its messages; redrive moves them back to the source queue after confirmation.
class DlqScreen extends StatefulWidget {
  const DlqScreen({super.key, required this.repository, this.queue});

  /// Data source of the screen.
  final BackofficeRepository repository;

  /// Queue whose messages are listed, or null to show only the queues.
  final String? queue;

  @override
  State<DlqScreen> createState() => _DlqScreenState();
}

class _DlqScreenState extends State<DlqScreen> {
  late Future<List<DeadLetterQueue>> _queues = widget.repository.deadLetterQueues();
  Future<List<DeadLetterMessage>>? _messages;

  @override
  void initState() {
    super.initState();
    _messages = _loadMessages(widget.queue);
  }

  @override
  void didUpdateWidget(covariant DlqScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.queue != widget.queue) {
      _messages = _loadMessages(widget.queue);
    }
  }

  Future<List<DeadLetterMessage>>? _loadMessages(String? queue) =>
      queue == null ? null : widget.repository.deadLetterMessages(queue);

  Future<void> _confirmRedrive(String queue, int count) async {
    final l10n = BackofficeLocalizations.of(context);
    final shared = AppLocalizations.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
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
      ),
    );
    if (confirmed != true || !mounted) return;
    final int moved;
    try {
      moved = await widget.repository.redrive(queue);
    } on ApiErrorException catch (error) {
      if (mounted) showActionError(context, error);
      return;
    }
    if (!mounted) return;
    setState(() {
      _queues = widget.repository.deadLetterQueues();
      _messages = _loadMessages(queue);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(l10n.dlqRedriveDone(moved))),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    final selected = widget.queue;
    final messages = _messages;
    return BackofficePage(
      title: l10n.dlqTitle,
      subtitle: l10n.dlqSubtitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AsyncBody<List<DeadLetterQueue>>(
            future: _queues,
            builder: (context, queues) {
              if (queues.isEmpty) {
                return EmptyState(
                  icon: Icons.inbox_outlined,
                  title: l10n.dlqEmpty,
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final queue in queues)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: AppCard(
                        key: ValueKey('dlq-queue-${queue.name}'),
                        onTap: () => context.go(
                          '/backoffice/dlq/${Uri.encodeComponent(queue.name)}',
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                queue.name,
                                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: queue.name == selected
                                      ? FontWeight.bold
                                      : FontWeight.normal,
                                ),
                              ),
                            ),
                            Text(l10n.dlqMessagesCount(queue.messageCount)),
                          ],
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
          const SizedBox(height: AppSpacing.md),
          if (selected == null || messages == null)
            EmptyState(
              icon: Icons.touch_app_outlined,
              title: l10n.dlqSelectQueue,
            )
          else
            _QueueMessages(
              queue: selected,
              messages: messages,
              onRedrive: (count) => _confirmRedrive(selected, count),
            ),
        ],
      ),
    );
  }
}

class _QueueMessages extends StatelessWidget {
  const _QueueMessages({
    required this.queue,
    required this.messages,
    required this.onRedrive,
  });

  final String queue;
  final Future<List<DeadLetterMessage>> messages;
  final ValueChanged<int> onRedrive;

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    return AsyncBody<List<DeadLetterMessage>>(
      future: messages,
      builder: (context, list) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${l10n.dlqMessagesTitle}: $queue',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              FilledButton(
                key: const Key('dlq-redrive'),
                onPressed: list.isEmpty ? null : () => onRedrive(list.length),
                child: Text(l10n.dlqRedrive),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          if (list.isEmpty)
            EmptyState(
              icon: Icons.check_circle_outline,
              title: l10n.dlqMessagesEmpty,
            )
          else
            for (final message in list)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${l10n.dlqMessageType}: ${message.type}',
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      Text('${l10n.dlqFirstError}: ${message.firstError}'),
                      Text(l10n.dlqReceiveCount(message.receiveCount)),
                      Text(
                        '${l10n.dlqSentAt}: ${formatTimestamp(message.sentAt)}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ),
        ],
      ),
    );
  }
}
