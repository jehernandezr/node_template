import 'dart:async';

import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/notifications_repository.dart';
import '../l10n/generated/notifications_localizations.dart';
import '../shared/constants/notifications_paths.dart';
import '../shared/types/types.dart';

/// Bandeja de notificaciones: no leídas y leídas, marcado al tocar y llegada en vivo arriba.
class NotificationsInboxScreen extends StatefulWidget {
  const NotificationsInboxScreen({super.key, required this.repository});

  final NotificationsRepository repository;

  @override
  State<NotificationsInboxScreen> createState() =>
      _NotificationsInboxScreenState();
}

class _NotificationsInboxScreenState extends State<NotificationsInboxScreen> {
  AsyncValue<List<AppNotification>> _inbox = const AsyncValue.loading();
  // Notificaciones que llegan antes de que termine la carga inicial.
  final List<AppNotification> _liveBuffer = [];
  late final StreamSubscription<AppNotification> _liveSubscription;

  @override
  void initState() {
    super.initState();
    _liveSubscription = widget.repository.live().listen(_onLive);
    _fetch();
  }

  @override
  void dispose() {
    _liveSubscription.cancel();
    super.dispose();
  }

  Future<void> _fetch() async {
    final result = await AsyncValue.guard(widget.repository.fetchInbox);
    if (!mounted) return;
    setState(() {
      _inbox = switch (result) {
        AsyncData(value: final fetched) => AsyncValue.data(_merge(fetched)),
        _ => result,
      };
    });
  }

  /// Une las llegadas en vivo que esperaban la carga con [fetched].
  List<AppNotification> _merge(List<AppNotification> fetched) {
    final bufferedIds = _liveBuffer.map((n) => n.id).toSet();
    final merged = [
      ..._liveBuffer,
      ...fetched.where((n) => !bufferedIds.contains(n.id)),
    ];
    _liveBuffer.clear();
    return merged;
  }

  void _retry() {
    setState(() => _inbox = const AsyncValue.loading());
    _fetch();
  }

  void _onLive(AppNotification notification) {
    final items = _inbox.valueOrNull;
    if (items == null) {
      _liveBuffer.add(notification);
      return;
    }
    if (items.any((n) => n.id == notification.id)) return;
    setState(() => _inbox = AsyncValue.data([notification, ...items]));
  }

  Future<void> _open(AppNotification notification) async {
    final items = _inbox.valueOrNull;
    if (items == null || notification.read) return;
    await _markOptimistically(
      [
        for (final n in items)
          n.id == notification.id ? n.copyWith(read: true) : n,
      ],
      previous: items,
      save: () => widget.repository.markAsRead(notification.id),
    );
  }

  Future<void> _markAllRead() async {
    final items = _inbox.valueOrNull;
    if (items == null) return;
    await _markOptimistically(
      [for (final n in items) n.copyWith(read: true)],
      previous: items,
      save: widget.repository.markAllAsRead,
    );
  }

  /// Muestra [next] al instante y guarda con [save]. Si falla, vuelve a
  /// [previous] y avisa con [showActionError].
  Future<void> _markOptimistically(
    List<AppNotification> next, {
    required List<AppNotification> previous,
    required Future<void> Function() save,
  }) async {
    setState(() => _inbox = AsyncValue.data(next));
    try {
      await save();
    } catch (error) {
      if (!mounted) return;
      setState(() => _inbox = AsyncValue.data(previous));
      showActionError(
        context,
        error,
        message: NotificationsLocalizations.of(context).markReadError,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = NotificationsLocalizations.of(context);
    final common = AppLocalizations.of(context);
    final hasUnread = _inbox.valueOrNull?.any((n) => !n.read) ?? false;
    return AppPage(
      title: l10n.inboxTitle,
      actions: [
        TextButton(
          onPressed: hasUnread ? _markAllRead : null,
          child: Text(l10n.markAllRead),
        ),
        IconButton(
          tooltip: l10n.preferencesTooltip,
          icon: const Icon(Icons.tune),
          onPressed: () => context.go(NotificationsPaths.preferences),
        ),
      ],
      body: AsyncValueView<List<AppNotification>>(
        value: _inbox,
        errorMessage: l10n.loadError,
        codeLabel: common.errorCodeLabel,
        traceIdLabel: common.errorTraceIdLabel,
        retryLabel: common.actionRetry,
        onRetry: _retry,
        data: (items) => _InboxList(items: items, onOpen: _open),
      ),
    );
  }
}

class _InboxList extends StatelessWidget {
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
