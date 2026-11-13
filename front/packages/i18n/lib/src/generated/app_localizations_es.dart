// ignore_for_file: deprecated_member_use

// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class AppLocalizationsEs extends AppLocalizations {
  AppLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get appTitle => 'Plataforma';

  @override
  String get actionRetry => 'Reintentar';

  @override
  String get actionCancel => 'Cancelar';

  @override
  String get actionSave => 'Guardar';

  @override
  String get actionSignIn => 'Iniciar sesión';

  @override
  String get actionSignOut => 'Cerrar sesión';

  @override
  String get menuAccount => 'Cuenta';

  @override
  String get menuTasks => 'Tareas';

  @override
  String get menuNotifications => 'Notificaciones';

  @override
  String get menuAssistant => 'Asistente';

  @override
  String get menuBilling => 'Facturación';

  @override
  String get menuBackoffice => 'Administración';

  @override
  String get menuVerifier => 'Verificador';

  @override
  String get menuMore => 'Más';

  @override
  String get demoModeTitle => 'Modo demostración';

  @override
  String get demoModeHint =>
      'Estás viendo datos de ejemplo. Elige un perfil para entrar.';

  @override
  String get demoSignInCustomer => 'Entrar como cliente';

  @override
  String get demoSignInCustomerNoAssistant =>
      'Entrar como cliente sin asistente';

  @override
  String get demoSignInTenantAdmin => 'Entrar como administrador del tenant';

  @override
  String get demoSignInSuperAdmin => 'Entrar como superadministrador';

  @override
  String get forbiddenTitle => 'Acceso denegado';

  @override
  String get forbiddenMessage => 'No tienes permiso para ver esta página.';

  @override
  String get stepUpTitle => 'Verificación adicional';

  @override
  String get stepUpMessage =>
      'Esta sección exige que confirmes tu identidad con un segundo factor.';

  @override
  String get stepUpDemoVerify => 'Verificar (demostración)';

  @override
  String get goHome => 'Ir al inicio';

  @override
  String get loading => 'Cargando';

  @override
  String get errorCodeLabel => 'Código';

  @override
  String get errorTraceIdLabel => 'ID de traza';

  @override
  String get notFound => 'Página no encontrada.';

  @override
  String get confirm => 'Confirmar';

  @override
  String get delete => 'Eliminar';

  @override
  String get edit => 'Editar';

  @override
  String get close => 'Cerrar';

  @override
  String get back => 'Volver';

  @override
  String get search => 'Buscar';

  @override
  String get loadMore => 'Cargar más';

  @override
  String get emptyListTitle => 'Todavía no hay elementos.';

  @override
  String get error_platform_validation_invalid_input =>
      'Revisa los datos. Algún campo tiene un formato no válido.';

  @override
  String get error_platform_validation_required =>
      'Falta completar un campo obligatorio.';

  @override
  String get error_platform_internal_unexpected =>
      'Ocurrió un error inesperado. Intenta de nuevo.';

  @override
  String get error_platform_auth_unauthenticated =>
      'Inicia sesión para continuar.';

  @override
  String get error_platform_auth_forbidden =>
      'No tienes permiso para realizar esta acción.';

  @override
  String get error_platform_rate_limit_exceeded =>
      'Hiciste demasiadas solicitudes. Espera un momento.';

  @override
  String get error_platform_api_version_sunset =>
      'Esta versión de la aplicación ya no está disponible. Actualízala.';

  @override
  String get error_platform_resource_not_found =>
      'No encontramos lo que buscas.';

  @override
  String get error_platform_conflict_version_mismatch =>
      'El contenido cambió. Vuelve a cargarlo.';

  @override
  String get error_platform_kernel_invalid_id =>
      'El identificador no es válido.';

  @override
  String get error_platform_sharding_key_missing =>
      'Falta un dato necesario para procesar la solicitud.';

  @override
  String get error_platform_sharding_cross_shard_tx =>
      'No podemos completar esta operación con datos guardados en lugares distintos.';

  @override
  String get error_platform_sharding_tenant_migrating =>
      'Estamos actualizando tus datos. Intenta de nuevo en unos minutos.';

  @override
  String get error_platform_validation_invalid_type =>
      'Un campo tiene un tipo de dato no válido.';

  @override
  String get error_platform_validation_invalid_format =>
      'Un campo no tiene el formato esperado.';

  @override
  String get error_platform_validation_invalid_enum =>
      'Elige una de las opciones permitidas.';

  @override
  String get error_platform_validation_too_short =>
      'El valor es demasiado corto.';

  @override
  String get error_platform_validation_too_long =>
      'El valor es demasiado largo.';

  @override
  String get error_platform_validation_too_small =>
      'El valor es menor que el mínimo permitido.';

  @override
  String get error_platform_validation_too_large =>
      'El valor es mayor que el máximo permitido.';

  @override
  String get error_platform_validation_unknown_field =>
      'La solicitud incluye un dato que no se esperaba.';

  @override
  String get error_platform_sharding_tenant_not_writable =>
      'Estamos haciendo mantenimiento. Por ahora solo puedes consultar.';

  @override
  String get error_platform_criteria_unknown_field =>
      'No se puede filtrar ni ordenar por ese campo.';

  @override
  String get error_platform_criteria_invalid_value =>
      'La búsqueda tiene un valor no válido.';

  @override
  String get error_platform_criteria_invalid_limit =>
      'La cantidad de resultados por página no es válida.';

  @override
  String get error_platform_resilience_circuit_open =>
      'Un servicio no está disponible por ahora. Intenta en unos minutos.';

  @override
  String get error_platform_resilience_timeout =>
      'La operación tardó demasiado. Intenta de nuevo.';

  @override
  String get error_platform_resilience_bulkhead_full =>
      'Hay muchas operaciones en curso. Intenta en unos instantes.';

  @override
  String get error_platform_resilience_overloaded =>
      'El servicio está ocupado. Intenta en unos instantes.';

  @override
  String get error_identity_auth_invalid_credentials =>
      'El email o la contraseña no son correctos.';

  @override
  String get error_identity_mfa_token_invalid =>
      'La verificación venció. Inicia sesión de nuevo.';

  @override
  String get error_identity_mfa_code_invalid => 'El código no es correcto.';

  @override
  String get error_identity_mfa_code_expired =>
      'El código expiró. Solicita uno nuevo.';

  @override
  String get error_identity_mfa_too_many_attempts =>
      'Agotaste los intentos. Solicita un código nuevo.';

  @override
  String get error_identity_mfa_step_up_required =>
      'Confirma tu identidad para continuar.';

  @override
  String get error_identity_session_revoked =>
      'Tu sesión se cerró. Inicia sesión de nuevo.';

  @override
  String get error_identity_token_stale_permissions =>
      'Tus permisos cambiaron. Actualizando la sesión.';

  @override
  String get errorFallback => 'Algo salió mal. Intenta de nuevo.';
}
