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
  String get signInEmail => 'Email';

  @override
  String get signInPassword => 'Contraseña';

  @override
  String get mfaChooseMethod =>
      'Elige cómo quieres recibir el código de verificación.';

  @override
  String get mfaMethodDeviceOtp => 'Código en tu dispositivo de confianza';

  @override
  String get mfaMethodEmailOtp => 'Código por email';

  @override
  String get mfaMethodTotp => 'App de autenticación';

  @override
  String get mfaMethodRecoveryCode => 'Código de recuperación';

  @override
  String get mfaCode => 'Código de verificación';

  @override
  String get mfaVerify => 'Verificar';

  @override
  String get goHome => 'Ir al inicio';

  @override
  String get loading => 'Cargando';

  @override
  String get errorCodeLabel => 'Código';

  @override
  String get errorTraceIdLabel => 'ID de traza';

  @override
  String errorCodeLine(String code) {
    return 'Código: $code';
  }

  @override
  String errorTraceIdLine(String traceId) {
    return 'ID de traza: $traceId';
  }

  @override
  String get metaSeparator => ' · ';

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
  String get error_platform_sharding_wrong_region =>
      'Tu organización vive en otra región. Reintentando allá.';

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
  String get error_platform_auth_token_expired =>
      'Tu acceso venció. Actualizando la sesión.';

  @override
  String get error_platform_auth_origin_rejected =>
      'Esta solicitud no viene de un origen permitido.';

  @override
  String get error_platform_api_unsupported_version =>
      'Esta versión de la aplicación no es compatible. Actualízala.';

  @override
  String get error_platform_http_payload_too_large =>
      'Lo que enviaste es demasiado grande.';

  @override
  String get error_platform_http_unsupported_media_type =>
      'No se pudo enviar ese tipo de contenido.';

  @override
  String get error_platform_http_malformed_body =>
      'No se pudo leer lo que enviaste. Inténtalo de nuevo.';

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
  String get error_identity_mfa_method_unavailable =>
      'Ese método de verificación no está disponible. Elige otro.';

  @override
  String get error_identity_session_expired =>
      'Tu sesión venció. Inicia sesión de nuevo.';

  @override
  String get error_identity_session_reused =>
      'Por seguridad cerramos tu sesión. Inicia sesión de nuevo.';

  @override
  String get error_identity_token_revoked =>
      'Tu acceso fue revocado. Inicia sesión de nuevo.';

  @override
  String get error_identity_user_suspended =>
      'Tu cuenta está suspendida. Contacta al soporte.';

  @override
  String get error_identity_tenant_suspended =>
      'Tu organización está suspendida. Contacta al soporte.';

  @override
  String get error_identity_auth_email_not_verified =>
      'Verifica tu correo para continuar. Revisa el enlace que te enviamos.';

  @override
  String get error_identity_user_email_verification_invalid =>
      'El enlace de verificación no es válido o venció. Solicita uno nuevo.';

  @override
  String get error_identity_password_policy_violation =>
      'La contraseña debe tener entre 12 y 128 caracteres y ser distinta de tu correo.';

  @override
  String get error_identity_password_breached =>
      'Esa contraseña apareció en filtraciones conocidas. Elige otra.';

  @override
  String get error_identity_password_current_invalid =>
      'La contraseña actual no es correcta.';

  @override
  String get error_identity_password_reset_invalid =>
      'El enlace para restablecer la contraseña no es válido o venció. Solicita uno nuevo.';

  @override
  String get error_identity_device_signature_invalid =>
      'No se pudo comprobar este dispositivo.';

  @override
  String get error_identity_device_key_invalid =>
      'La clave de este dispositivo no es válida.';

  @override
  String get error_identity_mfa_recovery_not_ready =>
      'La recuperación todavía no está disponible. Vuelve a intentarlo cuando termine la espera.';

  @override
  String get error_identity_mfa_factor_already_enrolled =>
      'Ese método de verificación ya está activo.';

  @override
  String get error_identity_mfa_factor_not_enrolled =>
      'Ese método de verificación no está activo.';

  @override
  String get error_identity_passkey_verification_failed =>
      'No se pudo verificar la passkey.';

  @override
  String get error_identity_passkey_challenge_expired =>
      'La verificación de la passkey venció. Inténtalo de nuevo.';

  @override
  String get error_identity_tenant_slug_taken =>
      'Ese identificador ya está en uso. Elige otro.';

  @override
  String get error_identity_tenant_not_member =>
      'No eres miembro de esa organización.';

  @override
  String get error_identity_access_last_owner =>
      'La organización debe conservar al menos un propietario.';

  @override
  String get error_identity_access_system_role_immutable =>
      'Los roles del sistema no se pueden modificar ni borrar.';

  @override
  String get error_identity_access_name_taken =>
      'Ya existe un grupo o rol con ese nombre.';

  @override
  String get error_identity_invitation_invalid =>
      'La invitación no es válida, venció o ya se usó.';

  @override
  String get error_identity_invitation_email_mismatch =>
      'El correo verificado de tu cuenta no coincide con el de la invitación.';

  @override
  String get error_identity_api_key_invalid => 'La API key no es válida.';

  @override
  String get error_identity_api_key_expired => 'La API key venció.';

  @override
  String get error_identity_api_key_ip_not_allowed =>
      'La API key no puede usarse desde esta dirección IP.';

  @override
  String get error_identity_api_key_permission_not_grantable =>
      'No puedes otorgar permisos que tu cuenta no tiene.';

  @override
  String get error_identity_service_account_disabled =>
      'La cuenta de servicio está deshabilitada.';

  @override
  String get error_platform_access_feature_not_included =>
      'Tu plan no incluye esta función.';

  @override
  String get error_platform_access_flag_disabled =>
      'Esta función todavía no está disponible para ti.';

  @override
  String get error_tasks_task_not_found => 'No encontramos esa tarea.';

  @override
  String get error_tasks_task_version_conflict =>
      'La tarea cambió mientras la editabas. Vuelve a cargarla.';

  @override
  String get error_tasks_search_query_too_short =>
      'Escribe al menos dos caracteres para buscar.';

  @override
  String get error_notifications_inbox_not_found =>
      'No encontramos esa notificación.';

  @override
  String get error_notifications_preferences_invalid_quiet_hours =>
      'Revisa el horario de silencio: usa horas en formato 24 horas y elige tu zona horaria.';

  @override
  String get error_notifications_realtime_unauthenticated =>
      'No se pudo abrir la conexión en vivo. Inicia sesión de nuevo.';

  @override
  String get error_reports_run_not_found =>
      'No encontramos esa ejecución del reporte.';

  @override
  String get error_reports_run_not_ready =>
      'El reporte todavía se está generando. Espera un momento.';

  @override
  String get error_reports_run_expired =>
      'Este reporte venció. Genera uno nuevo.';

  @override
  String get error_reports_type_unknown => 'Ese reporte no existe.';

  @override
  String get error_reports_params_invalid_range =>
      'Revisa las fechas: el fin debe ser posterior al inicio y el rango no puede ser demasiado largo.';

  @override
  String get error_reports_result_too_large =>
      'El reporte es demasiado grande. Acota el rango de fechas.';

  @override
  String get error_billing_subscription_not_found =>
      'Tu organización todavía no tiene una suscripción.';

  @override
  String get error_billing_subscription_not_changeable =>
      'No puedes cambiar de plan mientras la suscripción esté suspendida o cancelada.';

  @override
  String get error_billing_plan_not_available => 'Ese plan no está disponible.';

  @override
  String get error_billing_plan_usage_exceeds_limit =>
      'Tu uso actual supera los límites de ese plan. Reduce el uso o elige otro plan.';

  @override
  String get error_billing_invoice_not_found => 'No encontramos esa factura.';

  @override
  String get error_billing_invoice_invalid_state =>
      'Esa factura no admite esta operación en su estado actual.';

  @override
  String get error_billing_quota_exceeded =>
      'Alcanzaste el límite de tu plan. Cambia de plan para continuar.';

  @override
  String get errorFallback => 'Algo salió mal. Intenta de nuevo.';
}
