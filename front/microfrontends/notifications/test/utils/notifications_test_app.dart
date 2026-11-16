import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_notifications/mf_notifications.dart';
import 'package:mf_notifications/src/l10n/generated/notifications_localizations.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

/// App with the shared texts and the notifications texts installed around
/// the screen the way the deferred page installs them.
final class NotificationsTestApp {
  /// The app in [locale]. A null [session] is a signed-in session built with
  /// `SessionBuilder()`.
  const NotificationsTestApp({this.locale = const Locale('es'), this.session});

  /// Locale of the app.
  final Locale locale;

  /// Session that `context.can` and `AccessGate` see.
  final UserSession? session;

  /// Notifications texts in Spanish, to find widgets by their text.
  static NotificationsLocalizations get es =>
      lookupNotificationsLocalizations(const Locale('es'));

  /// Notifications texts in English.
  static NotificationsLocalizations get en =>
      lookupNotificationsLocalizations(const Locale('en'));

  /// The real manifest routes over [scope], starting at [initialLocation].
  /// Like the shell, the app only has the shared delegates: the deferred page
  /// adds the notifications texts.
  static Widget routed(
    MicrofrontendScope scope, {
    String initialLocation = NotificationsPaths.inbox,
    Locale locale = const Locale('es'),
  }) => TestApp(locale: locale).wrapRouter(
    GoRouter(
      initialLocation: initialLocation,
      routes: notificationsManifest.buildRoutes(
        DeferredLibraryLoader().page,
        () => scope,
      ),
    ),
  );

  /// A `MaterialApp` whose home is [home] with the notifications texts.
  Widget wrap(Widget home) => _app.wrap(_localized(home));

  /// Pumps [wrap] of [home] and lets the first frame settle with one `pump`.
  Future<void> pump(WidgetTester tester, Widget home) =>
      _app.pump(tester, _localized(home));

  TestApp get _app => TestApp(locale: locale, session: session);

  static Widget _localized(Widget home) => DeferredLocalizations(
    delegates: const [NotificationsLocalizations.delegate],
    child: home,
  );
}
