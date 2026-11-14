/// Constructores de las pantallas de la cuenta, usados por el manifiesto.
///
/// Este archivo se importa como `deferred`, así que el repositorio, los datos
/// de ejemplo y los textos de la cuenta viajan con las pantallas.
library;

import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import '../data/account_repository.dart';
import '../data/api_account_repository.dart';
import '../data/fake_account_repository.dart';
import '../l10n/generated/account_localizations.dart';
import '../shared/enums/account_enums.dart';
import '../shared/utils/account_paths.dart';
import 'account_overview_screen.dart';
import 'agreements_screen.dart';
import 'devices_screen.dart';
import 'security_screen.dart';
import 'sessions_screen.dart';

/// Repositorio de la cuenta del identity de [scope]. Cada scope tiene el suyo
/// y lo libera al cerrarse.
///
/// El modo del shell decide: en demo, los datos en memoria; en vivo, la API
/// de identity, que solo sirve lo que tiene contrato.
AccountRepository _repository(MicrofrontendScope scope) =>
    scope.get<AccountRepository>(
      (services) => switch (services.mode) {
        ShellMode.demo => FakeAccountRepository(),
        ShellMode.live => ApiAccountRepository(client: services.api),
      },
    );

/// Envuelve [build] con los textos de la cuenta. Los delegados se cargan con la
/// pantalla diferida, no con el shell.
Widget _localized(WidgetBuilder build) => Builder(
  builder: (context) => Localizations.override(
    context: context,
    delegates: const [AccountLocalizations.delegate],
    child: Builder(builder: build),
  ),
);

/// Pantalla de [section] si el repositorio sirve [capability]; si no, una
/// que lo dice, para quien llegue por enlace.
Widget _ifCapable(
  MicrofrontendScope scope,
  AccountCapability capability,
  AccountSection section,
  Widget Function(AccountRepository repository) build,
) => _localized((context) {
  final repository = _repository(scope);
  if (repository.capabilities.contains(capability)) return build(repository);
  final l10n = AccountLocalizations.of(context);
  return AppPage(
    title: l10n.sectionUnavailableTitle,
    onBack: () => context.go(accountPath(AccountSection.overview)),
    body: EmptyState(
      key: ValueKey('account-${section.name}-unavailable'),
      icon: Icons.cloud_off_outlined,
      title: l10n.sectionUnavailableTitle,
      message: l10n.sectionUnavailableMessage,
    ),
  );
});

Widget buildAccountOverviewScreen(MicrofrontendScope scope) => _localized(
  (_) => AccountOverviewScreen(
    repository: _repository(scope),
    onSignOut: () => scope.services.signOut(),
  ),
);

Widget buildAccountSessionsScreen(MicrofrontendScope scope) => _localized(
  (_) => SessionsScreen(
    repository: _repository(scope),
    requestStepUp: scope.services.requestStepUp,
  ),
);

Widget buildAccountDevicesScreen(MicrofrontendScope scope) => _localized(
  (_) => DevicesScreen(
    repository: _repository(scope),
    requestStepUp: scope.services.requestStepUp,
  ),
);

Widget buildAccountSecurityScreen(MicrofrontendScope scope) => _ifCapable(
  scope,
  AccountCapability.security,
  AccountSection.security,
  (repository) => SecurityScreen(
    repository: repository,
    requestStepUp: scope.services.requestStepUp,
  ),
);

Widget buildAccountAgreementsScreen(MicrofrontendScope scope) => _ifCapable(
  scope,
  AccountCapability.agreements,
  AccountSection.agreements,
  (repository) => AgreementsScreen(repository: repository),
);
