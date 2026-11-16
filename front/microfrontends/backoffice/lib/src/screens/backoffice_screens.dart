import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import '../data/backoffice_data.dart';
import '../data/backoffice_repository.dart';
import '../l10n/generated/backoffice_localizations.dart';
import 'dlq_screen.dart';
import 'overview_screen.dart';
import 'saga_detail_screen.dart';
import 'sagas_screen.dart';
import 'tenant_detail_screen.dart';
import 'tenants_screen.dart';

/// Entry points of the manifest's screens. Each one builds the screen with the
/// repository of the identity of the scope, inside the backoffice
/// localizations (the shell does not register them: they travel in the
/// deferred chunk).
abstract final class BackofficeScreens {
  /// Overview cards.
  static Widget overview(MicrofrontendScope scope) =>
      _localized(OverviewScreen(repository: _repository(scope)));

  /// Tenant list.
  static Widget tenants(MicrofrontendScope scope) =>
      _localized(TenantsScreen(repository: _repository(scope)));

  /// Detail of the tenant [tenantId].
  static Widget tenantDetail(MicrofrontendScope scope, String tenantId) =>
      _localized(
        TenantDetailScreen(tenantId: tenantId, repository: _repository(scope)),
      );

  /// Saga list.
  static Widget sagas(MicrofrontendScope scope) =>
      _localized(SagasScreen(repository: _repository(scope)));

  /// Detail of the saga [sagaId].
  static Widget sagaDetail(MicrofrontendScope scope, String sagaId) =>
      _localized(
        SagaDetailScreen(sagaId: sagaId, repository: _repository(scope)),
      );

  /// Dead-letter queues, with the messages of [queue] when it is not null.
  /// The key makes a change of queue build a new screen.
  static Widget dlq(MicrofrontendScope scope, {String? queue}) => _localized(
    DlqScreen(
      key: ValueKey('dlq:${queue ?? ''}'),
      queue: queue,
      repository: _repository(scope),
    ),
  );

  static BackofficeRepository _repository(MicrofrontendScope scope) =>
      scope.repository(BackofficeData.repository);

  static Widget _localized(Widget child) => DeferredLocalizations(
    delegates: const [BackofficeLocalizations.delegate],
    child: child,
  );
}
