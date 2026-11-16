/// Screens of the notifications microfrontend. Imported as a deferred library
/// by `mf_notifications.dart`, so the screens, their copy and the demo data
/// load on the first visit to `/notifications`.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import '../data/notifications_data.dart';
import '../l10n/generated/notifications_localizations.dart';
import 'inbox_screen.dart';
import 'preferences_screen.dart';

export 'inbox_screen.dart';
export 'preferences_screen.dart';

/// Builds each notifications screen for a [MicrofrontendScope]. The repository
/// is the scope's: one instance per identity, the same the lifecycle uses.
abstract final class NotificationsScreens {
  /// `/notifications`.
  static Widget inbox(MicrofrontendScope scope) => _withNotificationsTexts(
    NotificationsInboxScreen(
      repository: scope.repository(NotificationsData.repository),
    ),
  );

  /// `/notifications/preferences`.
  static Widget preferences(MicrofrontendScope scope) =>
      _withNotificationsTexts(
        NotificationsPreferencesScreen(
          repository: scope.repository(NotificationsData.repository),
        ),
      );

  /// The delegates load with the deferred screens, not with the shell.
  static Widget _withNotificationsTexts(Widget child) => DeferredLocalizations(
    delegates: const [NotificationsLocalizations.delegate],
    child: child,
  );
}
