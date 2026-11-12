/// Screens of the backoffice. Imported only as a deferred library by the manifest,
/// so customers never download these pages, their models, the fake repository
/// or their strings.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import '../data/backoffice_repository.dart';
import '../data/fake_backoffice_repository.dart';
import '../l10n/generated/backoffice_localizations.dart';
import 'dlq_screen.dart';
import 'overview_screen.dart';
import 'saga_detail_screen.dart';
import 'sagas_screen.dart';
import 'tenant_detail_screen.dart';
import 'tenants_screen.dart';

export 'dlq_screen.dart';
export 'overview_screen.dart';
export 'saga_detail_screen.dart';
export 'sagas_screen.dart';
export 'tenant_detail_screen.dart';
export 'tenants_screen.dart';

/// Entry points called by the manifest's routes. Each one builds the screen with
/// the repository of the current identity, and applies the backoffice localizations.

Widget overviewPage(BuildContext context, MicrofrontendScope scope) =>
    _localized(context, OverviewScreen(repository: _repository(scope)));

Widget tenantsPage(BuildContext context, MicrofrontendScope scope) =>
    _localized(context, TenantsScreen(repository: _repository(scope)));

Widget tenantDetailPage(BuildContext context, MicrofrontendScope scope, String tenantId) =>
    _localized(
      context,
      TenantDetailScreen(tenantId: tenantId, repository: _repository(scope)),
    );

Widget sagasPage(BuildContext context, MicrofrontendScope scope) =>
    _localized(context, SagasScreen(repository: _repository(scope)));

Widget sagaDetailPage(BuildContext context, MicrofrontendScope scope, String sagaId) =>
    _localized(
      context,
      SagaDetailScreen(sagaId: sagaId, repository: _repository(scope)),
    );

Widget dlqPage(BuildContext context, MicrofrontendScope scope, {String? queue}) => _localized(
  context,
  DlqScreen(
    key: ValueKey('dlq:${queue ?? ''}'),
    queue: queue,
    repository: _repository(scope),
  ),
);

/// One repository per identity: the scope creates it on first use and disposes it with the identity.
BackofficeRepository _repository(MicrofrontendScope scope) =>
    scope.get<BackofficeRepository>((services) => FakeBackofficeRepository());

Widget _localized(BuildContext context, Widget child) => Localizations.override(
  context: context,
  delegates: const [BackofficeLocalizations.delegate],
  child: child,
);
