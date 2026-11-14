import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/notifications_repository.dart';
import '../l10n/generated/notifications_localizations.dart';
import '../l10n/notification_labels.dart';
import '../shared/types/types.dart';

/// Preferencias: matriz de tipos por canales y horario de silencio.
class NotificationsPreferencesScreen extends StatefulWidget {
  const NotificationsPreferencesScreen({super.key, required this.repository});

  final NotificationsRepository repository;

  @override
  State<NotificationsPreferencesScreen> createState() =>
      _NotificationsPreferencesScreenState();
}

class _NotificationsPreferencesScreenState
    extends State<NotificationsPreferencesScreen> {
  AsyncValue<NotificationPreferences> _preferences = const AsyncValue.loading();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final result = await AsyncValue.guard(widget.repository.fetchPreferences);
    if (!mounted) return;
    setState(() => _preferences = result);
  }

  void _retry() {
    setState(() => _preferences = const AsyncValue.loading());
    _load();
  }

  /// Muestra [next] al instante. Si el guardado falla, vuelve a la versión
  /// anterior y avisa con [showActionError].
  Future<void> _update(NotificationPreferences next) async {
    final previous = _preferences;
    setState(() => _preferences = AsyncValue.data(next));
    try {
      await widget.repository.savePreferences(next);
    } catch (error) {
      if (!mounted) return;
      setState(() => _preferences = previous);
      showActionError(
        context,
        error,
        message: NotificationsLocalizations.of(context).saveError,
      );
    }
  }

  Future<void> _setChannel(
    NotificationType type,
    NotificationChannel channel,
    bool on,
  ) async {
    final current = _preferences.valueOrNull;
    if (current == null) return;
    await _update(current.withChannel(type, channel, on));
  }

  Future<void> _pickQuietTime({required bool start}) async {
    final current = _preferences.valueOrNull;
    if (current == null) return;
    final l10n = NotificationsLocalizations.of(context);
    final initial = start ? current.quietStart : current.quietEnd;
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: initial.hour, minute: initial.minute),
      helpText: start ? l10n.quietHoursStartPicker : l10n.quietHoursEndPicker,
    );
    if (picked == null || !mounted) return;
    final time = ClockTime(picked.hour, picked.minute);
    await _update(
      start
          ? current.withQuietHours(start: time)
          : current.withQuietHours(end: time),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = NotificationsLocalizations.of(context);
    final common = AppLocalizations.of(context);
    return AppPage(
      title: l10n.preferencesTitle,
      body: AsyncValueView<NotificationPreferences>(
        value: _preferences,
        errorMessage: l10n.loadError,
        codeLabel: common.errorCodeLabel,
        traceIdLabel: common.errorTraceIdLabel,
        retryLabel: common.actionRetry,
        onRetry: _retry,
        data: (preferences) => _buildForm(context, l10n, preferences),
      ),
    );
  }

  Widget _buildForm(
    BuildContext context,
    NotificationsLocalizations l10n,
    NotificationPreferences preferences,
  ) {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: [
        Row(
          children: [
            Expanded(
              child: Text(l10n.typeHeader, style: theme.textTheme.labelLarge),
            ),
            for (final channel in NotificationChannel.values)
              SizedBox(
                width: 72,
                child: Text(
                  l10n.channelLabel(channel),
                  textAlign: TextAlign.center,
                  style: theme.textTheme.labelSmall,
                ),
              ),
          ],
        ),
        const Divider(),
        for (final type in NotificationType.values)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l10n.typeLabel(type)),
                      if (type.isMandatory)
                        Text(
                          l10n.securityLocked,
                          style: theme.textTheme.labelSmall,
                        ),
                    ],
                  ),
                ),
                for (final channel in NotificationChannel.values)
                  SizedBox(
                    width: 72,
                    child: Center(
                      child: Switch(
                        key: ValueKey('pref-${type.name}-${channel.name}'),
                        value: preferences.isEnabled(type, channel),
                        onChanged: type.isMandatory
                            ? null
                            : (on) => _setChannel(type, channel, on),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        const Divider(),
        Text(l10n.quietHoursTitle, style: theme.textTheme.titleMedium),
        ListTile(
          key: const ValueKey('quiet-start'),
          title: Text(l10n.quietHoursStart),
          trailing: Text(preferences.quietStart.toString()),
          onTap: () => _pickQuietTime(start: true),
        ),
        ListTile(
          key: const ValueKey('quiet-end'),
          title: Text(l10n.quietHoursEnd),
          trailing: Text(preferences.quietEnd.toString()),
          onTap: () => _pickQuietTime(start: false),
        ),
      ],
    );
  }
}
