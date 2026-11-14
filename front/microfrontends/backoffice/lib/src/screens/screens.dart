/// Screens of the backoffice. Imported only as a deferred library by the
/// manifest, so customers never download these pages, their data, the fake
/// repository or their strings.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import '../data/backoffice_repository.dart';
import '../data/fake_backoffice_repository.dart';
import 'dlq_screen.dart';
import 'overview_screen.dart';
import 'saga_detail_screen.dart';
import 'sagas_screen.dart';
import 'tenant_detail_screen.dart';
import 'tenants_screen.dart';
import 'widgets.dart';

export 'dlq_screen.dart';
export 'overview_screen.dart';
export 'saga_detail_screen.dart';
export 'sagas_screen.dart';
export 'tenant_detail_screen.dart';
export 'tenants_screen.dart';

/// Entry points of the manifest's screens. Each one builds the screen with the
/// repository of the identity of [scope] and the backoffice localizations.

Widget overviewPage(MicrofrontendScope scope) =>
    BackofficeLocalized(child: OverviewScreen(repository: _repository(scope)));

Widget tenantsPage(MicrofrontendScope scope) =>
    BackofficeLocalized(child: TenantsScreen(repository: _repository(scope)));

Widget tenantDetailPage(MicrofrontendScope scope, String tenantId) =>
    BackofficeLocalized(
      child: TenantDetailScreen(
        tenantId: tenantId,
        repository: _repository(scope),
      ),
    );

Widget sagasPage(MicrofrontendScope scope) =>
    BackofficeLocalized(child: SagasScreen(repository: _repository(scope)));

Widget sagaDetailPage(MicrofrontendScope scope, String sagaId) =>
    BackofficeLocalized(
      child: SagaDetailScreen(sagaId: sagaId, repository: _repository(scope)),
    );

Widget dlqPage(MicrofrontendScope scope, {String? queue}) =>
    BackofficeLocalized(
      child: DlqScreen(
        key: ValueKey('dlq:${queue ?? ''}'),
        queue: queue,
        repository: _repository(scope),
      ),
    );

/// One repository per identity: the scope creates it on first use and, since
/// it is a [ScopedResource], disposes it with the identity.
BackofficeRepository _repository(MicrofrontendScope scope) =>
    scope.get<BackofficeRepository>((services) => FakeBackofficeRepository());
