/// Constructores de las pantallas de la cuenta, usados por el manifiesto.
///
/// Este archivo se importa como `deferred`, así que el repositorio, los datos
/// de ejemplo y los textos de la cuenta viajan con las pantallas.
library;

import 'package:api/api.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import '../data/account_repository.dart';
import '../data/api_account_repository.dart';
import '../data/fake_account_repository.dart';
import '../l10n/generated/account_localizations.dart';
import 'account_overview_screen.dart';
import 'agreements_screen.dart';
import 'devices_screen.dart';
import 'security_screen.dart';
import 'sessions_screen.dart';

/// Repositorio de la cuenta del identity de [scope]. Cada scope tiene el suyo
/// y lo libera al cerrarse.
///
/// Si el shell aporta un [ApiClient], sesiones y dispositivos van a la API de
/// identity; lo demás aún no tiene contrato y sigue en el fake. Sin cliente
/// (demo y pruebas) todo es el fake.
AccountRepository _repository(MicrofrontendScope scope) =>
    scope.get<AccountRepository>((services) {
      final fake = FakeAccountRepository();
      final client = services.extra<ApiClient>();
      return client == null
          ? fake
          : ApiAccountRepository(client: client, pending: fake);
    });

/// Envuelve [build] con los textos de la cuenta. Los delegados se cargan con la
/// pantalla diferida, no con el shell.
Widget _localized(WidgetBuilder build) => Builder(
  builder: (context) => Localizations.override(
    context: context,
    delegates: const [AccountLocalizations.delegate],
    child: Builder(builder: build),
  ),
);

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

Widget buildAccountSecurityScreen(MicrofrontendScope scope) => _localized(
  (_) => SecurityScreen(
    repository: _repository(scope),
    requestStepUp: scope.services.requestStepUp,
  ),
);

Widget buildAccountAgreementsScreen(MicrofrontendScope scope) =>
    _localized((_) => AgreementsScreen(repository: _repository(scope)));
