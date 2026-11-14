import 'package:contracts/contracts.dart';
import 'package:flutter_localizations/flutter_localizations.dart'
    show GlobalWidgetsLocalizations;
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_account/src/l10n/generated/account_localizations.dart';
import 'package:shell_core/shell_core.dart';

/// App mínima con los textos de la cuenta y los compartidos, en español.
///
/// [session] es la sesión que ven `context.can` y `AccessGate`; por defecto no
/// tiene un segundo factor reciente.
Widget testApp(
  Widget home, {
  UserSession? session,
  Locale locale = const Locale('es'),
}) => MaterialApp(
  locale: locale,
  builder: (context, child) => ShellAccessScope(
    session: ValueNotifier(session ?? testSession()),
    child: child!,
  ),
  supportedLocales: AppLocalizations.supportedLocales,
  localizationsDelegates: [
    ...GlobalMaterialLocalizations.delegates,
    GlobalWidgetsLocalizations.delegate,
    AppLocalizations.delegate,
    AccountLocalizations.delegate,
  ],
  home: home,
);

Future<AccountLocalizations> loadEs() =>
    AccountLocalizations.delegate.load(const Locale('es'));

Future<AccountLocalizations> loadEn() =>
    AccountLocalizations.delegate.load(const Locale('en'));

Future<AppLocalizations> loadSharedEs() =>
    AppLocalizations.delegate.load(const Locale('es'));

/// Sesión de prueba. Con [mfaFresh] el segundo factor se verificó ahora.
UserSession testSession({bool mfaFresh = false}) => UserSession(
  userId: 'user-1',
  tenantId: 'tenant-1',
  mfaVerifiedAt: mfaFresh ? DateTime.now() : null,
);

/// Scope de una identidad de prueba. Cada llamada crea un scope nuevo.
MicrofrontendScope testScope({
  Future<void> Function()? onSignOut,
  Future<bool> Function()? onStepUp,
}) => MicrofrontendScope(
  DefaultShellServices(
    session: testSession(),
    onSignOut: onSignOut,
    onStepUp: onStepUp,
  ),
);

/// Error de API de prueba con código y traza conocidos.
ApiErrorException testApiError({
  String code = 'PLATFORM.AUTH.FORBIDDEN',
  String traceId = 'trace-123',
}) => ApiErrorException(
  ProblemDetails(
    type: 'about:blank',
    title: 'Forbidden',
    status: 403,
    code: code,
    traceId: traceId,
  ),
);

/// Step-up del shell que siempre se completa.
Future<bool> approveStepUp() async => true;

/// Step-up de prueba que cuenta las llamadas y responde [answer].
final class RecordingStepUp {
  RecordingStepUp({this.answer = true});

  final bool answer;
  int calls = 0;

  Future<bool> call() async {
    calls++;
    return answer;
  }
}
