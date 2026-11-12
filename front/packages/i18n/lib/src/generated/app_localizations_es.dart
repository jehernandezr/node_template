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
  String get errorFallback => 'Algo salió mal. Intenta de nuevo.';
}
