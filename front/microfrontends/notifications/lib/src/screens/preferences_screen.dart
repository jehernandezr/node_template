import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/notifications_repository.dart';
import '../l10n/generated/notifications_localizations.dart';
import '../l10n/notification_labels.dart';
import '../shared/types/types.dart';
import 'preferences_controller.dart';

/// Preferences: a matrix of types by channels and the quiet hours. The screen
/// only builds the view; [PreferencesController] holds the state.
class NotificationsPreferencesScreen extends StatelessWidget {
  /// Preferences screen backed by [repository].
  const NotificationsPreferencesScreen({super.key, required this.repository});

  /// Source of the preferences.
  final NotificationsRepository repository;

  @override
  Widget build(BuildContext context) =>
      ControllerBuilder<PreferencesController>(
        create: (_) => PreferencesController(repository)..start(),
        builder: (context, controller) {
          final l10n = NotificationsLocalizations.of(context);
          return AppPage(
            title: l10n.preferencesTitle,
            body: AsyncValueView<NotificationPreferences>(
              value: controller.preferences,
              errorMessage: l10n.loadError,
              onRetry: controller.start,
              data: (preferences) => _PreferencesForm(
                preferences: preferences,
                controller: controller,
              ),
            ),
          );
        },
      );
}

/// Fits the longest channel name and a switch side by side.
final class _PreferencesForm extends StatelessWidget {
  const _PreferencesForm({required this.preferences, required this.controller});

  static const double _channelColumnWidth = 72;

  final NotificationPreferences preferences;
  final PreferencesController controller;

  /// Switch has no label of its own: the type and the channel name it, so a screen reader tells them apart.
  @override
  Widget build(BuildContext context) {
    final l10n = NotificationsLocalizations.of(context);
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
                width: _channelColumnWidth,
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
                    width: _channelColumnWidth,
                    child: Center(
                      child: MergeSemantics(
                        child: Semantics(
                          label: l10n.preferenceSwitchLabel(
                            l10n.typeLabel(type),
                            l10n.channelLabel(channel),
                          ),
                          child: Switch(
                            key: ValueKey('pref-${type.name}-${channel.name}'),
                            value: preferences.isEnabled(type, channel),
                            onChanged: type.isMandatory
                                ? null
                                : (on) => _show(
                                    context,
                                    controller.setChannel(
                                      type,
                                      channel,
                                      enabled: on,
                                    ),
                                  ),
                          ),
                        ),
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
          onTap: () =>
              _pickQuietTime(context, controller, preferences, start: true),
        ),
        ListTile(
          key: const ValueKey('quiet-end'),
          title: Text(l10n.quietHoursEnd),
          trailing: Text(preferences.quietEnd.toString()),
          onTap: () =>
              _pickQuietTime(context, controller, preferences, start: false),
        ),
      ],
    );
  }

  static Future<void> _pickQuietTime(
    BuildContext context,
    PreferencesController controller,
    NotificationPreferences current, {
    required bool start,
  }) async {
    final l10n = NotificationsLocalizations.of(context);
    final initial = start ? current.quietStart : current.quietEnd;
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: initial.hour, minute: initial.minute),
      helpText: start ? l10n.quietHoursStartPicker : l10n.quietHoursEndPicker,
    );
    if (picked == null || !context.mounted) return;
    final time = ClockTime(picked.hour, picked.minute);
    await _show(
      context,
      start ? controller.setQuietStart(time) : controller.setQuietEnd(time),
    );
  }

  static Future<void> _show(
    BuildContext context,
    Future<ActionResult<void>> action,
  ) async {
    final failure = NotificationsLocalizations.of(context).saveError;
    final result = await action;
    if (!context.mounted) return;
    showActionResult(context, result, failure: failure);
  }
}
