import 'dart:async';

import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import '../data/notification_models.dart';
import '../data/notifications_repository.dart';
import '../data/notifications_scope.dart';
import '../l10n/generated/notifications_localizations.dart';

/// Builder que usa el manifiesto dentro de la página diferida.
Widget buildInboxScreen(MicrofrontendScope scope) =>
    NotificationsInboxScreen(repository: notificationsRepositoryOf(scope));

/// Bandeja de notificaciones: no leídas y leídas, marcado al tocar y llegada en vivo arriba.
class NotificationsInboxScreen extends StatefulWidget {
  const NotificationsInboxScreen({super.key, required this.repository});

  final NotificationsRepository repository;

  @override
  State<NotificationsInboxScreen> createState() =>
      _NotificationsInboxScreenState();
}

class _NotificationsInboxScreenState extends State<NotificationsInboxScreen> {
  List<AppNotification>? _items;
  Object? _error;
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
    try {
      final fetched = await widget.repository.fetchInbox();
      if (!mounted) return;
      final bufferedIds = _liveBuffer.map((n) => n.id).toSet();
      setState(() {
        _items = [
          ..._liveBuffer,
          ...fetched.where((n) => !bufferedIds.contains(n.id)),
        ];
        _liveBuffer.clear();
        _error = null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error);
    }
  }

  void _retry() {
    setState(() {
      _error = null;
      _items = null;
    });
    _fetch();
  }

  void _onLive(AppNotification notification) {
    final items = _items;
    if (items == null) {
      _liveBuffer.add(notification);
      return;
    }
    if (items.any((n) => n.id == notification.id)) return;
    setState(() => _items = [notification, ...items]);
  }

  Future<void> _open(AppNotification notification) async {
    if (notification.read) return;
    _replace([
      for (final n in _items ?? const <AppNotification>[])
        n.id == notification.id ? n.copyWith(read: true) : n,
    ]);
    await widget.repository.markAsRead(notification.id);
  }

  Future<void> _markAllRead() async {
    final items = _items;
    if (items == null) return;
    _replace([for (final n in items) n.copyWith(read: true)]);
    await widget.repository.markAllAsRead();
  }

  void _replace(List<AppNotification> items) => setState(() => _items = items);

  @override
  Widget build(BuildContext context) {
    final l10n = NotificationsLocalizations.of(context);
    final items = _items;
    final hasUnread = items?.any((n) => !n.read) ?? false;
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.inboxTitle),
        actions: [
          TextButton(
            onPressed: hasUnread ? _markAllRead : null,
            child: Text(l10n.markAllRead),
          ),
          IconButton(
            tooltip: l10n.preferencesTooltip,
            icon: const Icon(Icons.tune),
            onPressed: () => context.go('/notifications/preferences'),
          ),
        ],
      ),
      body: _buildBody(context, l10n, items),
    );
  }

  Widget _buildBody(
    BuildContext context,
    NotificationsLocalizations l10n,
    List<AppNotification>? items,
  ) {
    final error = _error;
    if (error != null) {
      return ErrorView.fromException(
        error,
        fallbackMessage: l10n.loadError,
        codeLabel: AppLocalizations.of(context).errorCodeLabel,
        traceIdLabel: AppLocalizations.of(context).errorTraceIdLabel,
        retryLabel: AppLocalizations.of(context).actionRetry,
        onRetry: _retry,
      );
    }
    if (items == null) return const LoadingView();
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
          onTap: () => _open(notification),
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
