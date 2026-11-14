import 'package:contracts/contracts.dart' show MfaRules;
import 'package:shell_core/shell_core.dart';

/// Id del microfrontend y primer segmento de sus rutas.
const MicrofrontendId accountId = MicrofrontendId('account');

/// Ruta base del microfrontend.
const String accountBasePath = '/account';

/// Etiqueta del menú. El shell la dibuja antes de cargar el microfrontend,
/// así que viaja con el manifiesto y no en los ARB diferidos.
const MenuLabel accountMenuLabel = MenuLabel({'es': 'Cuenta', 'en': 'Account'});

/// Tamaño de página al listar sesiones y dispositivos (máximo del contrato).
const int accountPageSize = 100;

/// Tope de páginas que el repositorio real recorre por listado.
const int accountMaxPages = 50;

/// Antigüedad máxima del segundo factor para acciones sensibles, la del
/// contrato (`MfaRules.stepUpMaxAgeMinutes`).
const Duration accountStepUpMaxAge = Duration(
  minutes: MfaRules.stepUpMaxAgeMinutes,
);
