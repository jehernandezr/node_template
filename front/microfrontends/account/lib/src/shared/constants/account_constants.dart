import 'package:contracts/contracts.dart' show MfaRules;

/// Ruta base del microfrontend.
const String accountBasePath = '/account';

/// Tamaño de página al listar sesiones y dispositivos (máximo del contrato).
const int accountPageSize = 100;

/// Tope de páginas que el repositorio real recorre por listado.
const int accountMaxPages = 50;

/// Dígitos del código del paso adicional de MFA.
const int stepUpCodeLength = 6;

/// Antigüedad máxima del segundo factor para acciones sensibles.
const Duration accountStepUpMaxAge = Duration(
  minutes: MfaRules.stepUpMaxAgeMinutes,
);
