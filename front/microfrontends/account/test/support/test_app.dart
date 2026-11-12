import 'package:contracts/contracts.dart';
import 'package:flutter_localizations/flutter_localizations.dart' show GlobalWidgetsLocalizations;
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_account/src/l10n/generated/account_localizations.dart';
import 'package:shell_core/shell_core.dart';

/// App mínima con los textos de la cuenta y los compartidos, en español.
Widget testApp(Widget home) => MaterialApp(
  locale: const Locale('es'),
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

Future<AppLocalizations> loadSharedEs() =>
    AppLocalizations.delegate.load(const Locale('es'));

/// Scope de una identidad de prueba. Cada llamada crea un scope nuevo.
MicrofrontendScope testScope({Future<void> Function()? onSignOut}) =>
    MicrofrontendScope(
      DefaultShellServices(
        session: UserSession(userId: 'user-1', tenantId: 'tenant-1'),
        eventBus: ShellEventBus(),
        onSignOut: onSignOut,
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
