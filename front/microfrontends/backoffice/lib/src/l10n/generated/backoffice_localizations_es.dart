// ignore_for_file: deprecated_member_use

// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'backoffice_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class BackofficeLocalizationsEs extends BackofficeLocalizations {
  BackofficeLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get navOverview => 'Resumen';

  @override
  String get navTenants => 'Tenants';

  @override
  String get navSagas => 'Sagas';

  @override
  String get navDlq => 'Colas muertas';

  @override
  String get loadError => 'No se pudo cargar la información. Intenta de nuevo.';

  @override
  String get notFound => 'No encontramos este registro.';

  @override
  String get filterStatus => 'Estado';

  @override
  String get filterRegion => 'Región';

  @override
  String get auditTitle => 'Auditoría';

  @override
  String get auditEmpty => 'Sin registros de auditoría.';

  @override
  String get overviewTitle => 'Backoffice';

  @override
  String get overviewSubtitle => 'Estado de la plataforma en este momento.';

  @override
  String get cardTenants => 'Tenants';

  @override
  String get cardSagas => 'Sagas que requieren intervención';

  @override
  String get cardDlq => 'Mensajes en colas muertas';

  @override
  String get cardOpen => 'Ver detalle';

  @override
  String get tenantsTitle => 'Tenants';

  @override
  String get tenantSearchLabel => 'Buscar por nombre o id';

  @override
  String get tenantsEmpty => 'Ningún tenant coincide con los filtros.';

  @override
  String get tenantDetailTitle => 'Detalle del tenant';

  @override
  String get tenantStatusActive => 'Activo';

  @override
  String get tenantStatusSuspended => 'Suspendido';

  @override
  String get tenantStatusProvisioning => 'Aprovisionando';

  @override
  String get tenantStatusDeleting => 'Eliminando';

  @override
  String get regionEuWest => 'Europa oeste';

  @override
  String get regionUsEast => 'Estados Unidos este';

  @override
  String get regionSaEast => 'Sudamérica este';

  @override
  String get sagasTitle => 'Sagas';

  @override
  String get sagasEmpty => 'No hay sagas con este estado.';

  @override
  String get sagaDetailTitle => 'Detalle de la saga';

  @override
  String get sagaSteps => 'Pasos';

  @override
  String get sagaStepsEmpty => 'La saga aún no ha ejecutado pasos.';

  @override
  String get sagaManualActions => 'Acciones manuales';

  @override
  String get sagaIntervention => 'Requiere intervención';

  @override
  String get sagaActionDone => 'Acción registrada en la auditoría.';

  @override
  String get reasonLabel => 'Motivo (obligatorio)';

  @override
  String get reasonHelp =>
      'Explica por qué haces esta acción. Queda registrado en la auditoría.';

  @override
  String get sagaStatusRunning => 'En ejecución';

  @override
  String get sagaStatusWaitingReply => 'Esperando respuesta';

  @override
  String get sagaStatusSuspended => 'Suspendida';

  @override
  String get sagaStatusCompleted => 'Completada';

  @override
  String get sagaStatusCompensating => 'Compensando';

  @override
  String get sagaStatusCompensated => 'Compensada';

  @override
  String get sagaStatusCompensationFailed => 'Compensación fallida';

  @override
  String get sagaStatusRequiresIntervention => 'Requiere intervención';

  @override
  String get sagaDirectionForward => 'Avance';

  @override
  String get sagaDirectionCompensation => 'Compensación';

  @override
  String get stepStatusDispatched => 'Despachado';

  @override
  String get stepStatusSucceeded => 'Correcto';

  @override
  String get stepStatusFailed => 'Fallido';

  @override
  String get manualActionRetryStep => 'Reintentar paso';

  @override
  String get manualActionForceCompensation => 'Forzar compensación';

  @override
  String get manualActionMarkResolved => 'Marcar como resuelta';

  @override
  String sagaStepLabel(int order, String operation) {
    return '$order. $operation';
  }

  @override
  String get dlqTitle => 'Colas muertas';

  @override
  String get dlqSubtitle => 'Mensajes que agotaron sus reintentos.';

  @override
  String get dlqEmpty => 'No hay colas configuradas.';

  @override
  String get dlqSelectQueue => 'Elige una cola para ver sus mensajes.';

  @override
  String get dlqMessagesEmpty => 'La cola no tiene mensajes.';

  @override
  String get dlqRedrive => 'Redistribuir';

  @override
  String get dlqRedriveTitle => 'Redistribuir mensajes';

  @override
  String dlqMessagesCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count mensajes',
      one: '1 mensaje',
    );
    return '$_temp0';
  }

  @override
  String dlqReceiveCount(int count) {
    return 'Recepciones: $count';
  }

  @override
  String dlqRedriveConfirm(int count, String queue) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count mensajes',
      one: '1 mensaje',
    );
    return 'Se moverán $_temp0 de \"$queue\" a su cola de origen. Revisa el primer error antes de continuar.';
  }

  @override
  String dlqRedriveDone(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count mensajes redistribuidos.',
      one: '1 mensaje redistribuido.',
    );
    return '$_temp0';
  }

  @override
  String get navSectionsLabel => 'Secciones del backoffice';

  @override
  String get valueNone => '-';

  @override
  String get filterStatusAll => 'Todos';

  @override
  String get filterRegionAll => 'Todas';

  @override
  String auditActorLine(String actor) {
    return 'Actor: $actor';
  }

  @override
  String auditEntityLine(String entity) {
    return 'Entidad: $entity';
  }

  @override
  String traceIdLine(String traceId) {
    return 'Trace ID: $traceId';
  }

  @override
  String overviewCount(int count) {
    return '$count';
  }

  @override
  String tenantPlanLine(String plan) {
    return 'Plan: $plan';
  }

  @override
  String tenantRegionLine(String region) {
    return 'Región: $region';
  }

  @override
  String tenantShardGroupLine(String shardGroup) {
    return 'Grupo de shards: $shardGroup';
  }

  @override
  String tenantUsersLine(int count) {
    return 'Usuarios: $count';
  }

  @override
  String sagaTypeLine(String type) {
    return 'Tipo: $type';
  }

  @override
  String sagaTenantLine(String tenantId) {
    return 'Tenant: $tenantId';
  }

  @override
  String sagaCurrentStepLine(String operation) {
    return 'Último paso: $operation';
  }

  @override
  String sagaUpdatedLine(String updatedAt) {
    return 'Actualizada: $updatedAt';
  }

  @override
  String sagaErrorCodeLine(String code) {
    return 'Código de error: $code';
  }

  @override
  String dlqMessagesHeading(String queue) {
    return 'Mensajes: $queue';
  }

  @override
  String dlqMessageTypeLine(String type) {
    return 'Tipo: $type';
  }

  @override
  String dlqFirstErrorLine(String error) {
    return 'Primer error: $error';
  }

  @override
  String dlqSentAtLine(String sentAt) {
    return 'Enviado: $sentAt';
  }
}
