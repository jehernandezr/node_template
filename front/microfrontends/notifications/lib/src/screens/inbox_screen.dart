import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/notifications_repository.dart';
import '../l10n/generated/notifications_localizations.dart';
import '../shared/constants/notifications_paths.dart';
import '../shared/types/types.dart';
import 'inbox_controller.dart';

/// Inbox: unread and read notifications, marked on tap, with live arrivals on
/// top. The screen only builds the view; [InboxController] holds the state.
class NotificationsInboxScreen extends StatelessWidget {
  /// Inbox backed by [repository].
  const NotificationsInboxScreen({super.key, required this.repository});

  /// Source of the notifications.
  final NotificationsRepository repository;

  @override
  Widget build(BuildContext context) => ControllerBuilder<InboxController>(
    create: (_) => InboxController(repository)..start(),
    builder: (context, controller) {
      final l10n = NotificationsLocalizations.of(context);
      return AppPage(
        title: l10n.inboxTitle,
        actions: [
          TextButton(
            onPressed: controller.unreadCount > 0
                ? () => _markAll(context, controller)
                : null,
            child: Text(l10n.markAllRead),
          ),
          IconButton(
            tooltip: l10n.preferencesTooltip,
            icon: const Icon(Icons.tune),
            onPressed: () => context.go(NotificationsPaths.preferences),
          ),
        ],
        body: AsyncValueView<List<AppNotification>>(
          value: controller.inbox,
          errorMessage: l10n.loadError,
          onRetry: controller.start,
          data: (items) => _InboxList(
            items: items,
            onOpen: (notification) => _open(context, controller, notification),
          ),
        ),
      );
    },
  );

  static Future<void> _open(
    BuildContext context,
    InboxController controller,
    AppNotification notification,
  ) async {
    final failure = NotificationsLocalizations.of(context).markReadError;
    final result = await controller.markRead(notification.id);
    if (!context.mounted) return;
    showActionResult(context, result, failure: failure);
  }

  static Future<void> _markAll(
    BuildContext context,
    InboxController controller,
  ) async {
    final failure = NotificationsLocalizations.of(context).markReadError;
    final result = await controller.markAllRead();
    if (!context.mounted) return;
    showActionResult(context, result, failure: failure);
  }
}

final class _InboxList extends StatelessWidget {
  const _InboxList({required this.items, required this.onOpen});

  final List<AppNotification> items;
  final ValueChanged<AppNotification> onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = NotificationsLocalizations.of(context);
    if (items.isEmpty) {
      return EmptyState(
        icon: Icons.notifications_none,
        title: l10n.emptyTitle,
        message: l10n.emptyMessage,
      );
    }
    final theme = Theme.of(context);
    return ListView.separated(
      itemCount: items.length,
      separatorBuilder: (context, index) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final notification = items[index];
        return ListTile(
          key: ValueKey('notification-${notification.id}'),
          leading: Icon(_iconFor(notification.type)),
          title: Text(
            notification.title,
            style: notification.read
                ? null
                : const TextStyle(fontWeight: FontWeight.w700),
          ),
          subtitle: Text(notification.body),
          trailing: Text(
            notification.read ? l10n.readLabel : l10n.unreadLabel,
            style: theme.textTheme.labelSmall,
          ),
          onTap: () => onOpen(notification),
        );
      },
    );
  }

  static IconData _iconFor(NotificationType type) => switch (type) {
    NotificationType.securityAlert => Icons.shield_outlined,
    NotificationType.taskUpdated => Icons.task_alt,
    NotificationType.invoiceIssued => Icons.receipt_long,
    NotificationType.accountActivity => Icons.person_outline,
  };
}
