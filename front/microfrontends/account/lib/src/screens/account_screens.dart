/// Entry points of the account screens, used by the manifest.
///
/// This file is imported as `deferred`, so the repository, the sample data
/// and the account texts travel with the screens.
library;

import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import '../data/account_data.dart';
import '../data/account_repository.dart';
import '../l10n/generated/account_localizations.dart';
import '../shared/enums/account_enums.dart';
import '../shared/utils/account_paths.dart';
import 'account_overview_screen.dart';
import 'agreements_screen.dart';
import 'devices_screen.dart';
import 'security_screen.dart';
import 'sessions_screen.dart';

/// Builds each account screen for a [MicrofrontendScope]. The repository is
/// the scope's, so every identity has its own and releases it on close.
abstract final class AccountScreens {
  static Widget overview(MicrofrontendScope scope) => _withAccountTexts(
    AccountOverviewScreen(
      repository: scope.repository(AccountData.repository),
      onSignOut: () => scope.services.signOut(),
    ),
  );

  static Widget sessions(MicrofrontendScope scope) => _withAccountTexts(
    SessionsScreen(
      repository: scope.repository(AccountData.repository),
      requestStepUp: scope.services.requestStepUp,
    ),
  );

  static Widget devices(MicrofrontendScope scope) => _withAccountTexts(
    DevicesScreen(
      repository: scope.repository(AccountData.repository),
      requestStepUp: scope.services.requestStepUp,
    ),
  );

  static Widget security(MicrofrontendScope scope) {
    final repository = scope.repository(AccountData.repository);
    return _withAccountTexts(
      _CapabilityGate(
        repository: repository,
        capability: AccountCapability.security,
        section: AccountSection.security,
        child: SecurityScreen(
          repository: repository,
          requestStepUp: scope.services.requestStepUp,
        ),
      ),
    );
  }

  static Widget agreements(MicrofrontendScope scope) {
    final repository = scope.repository(AccountData.repository);
    return _withAccountTexts(
      _CapabilityGate(
        repository: repository,
        capability: AccountCapability.agreements,
        section: AccountSection.agreements,
        child: AgreementsScreen(repository: repository),
      ),
    );
  }

  /// The delegates load with the deferred screens, not with the shell.
  static Widget _withAccountTexts(Widget child) => DeferredLocalizations(
    delegates: const [AccountLocalizations.delegate],
    child: child,
  );
}

/// Shows [child] when the repository serves [capability]; otherwise a page
/// that says so, for whoever arrives through a link.
final class _CapabilityGate extends StatelessWidget {
  const _CapabilityGate({
    required this.repository,
    required this.capability,
    required this.section,
    required this.child,
  });

  final AccountRepository repository;
  final AccountCapability capability;
  final AccountSection section;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (repository.capabilities.contains(capability)) return child;
    final l10n = AccountLocalizations.of(context);
    return AppPage(
      title: l10n.sectionUnavailableTitle,
      onBack: () => context.go(accountPath(AccountSection.overview)),
      body: EmptyState(
        key: ValueKey('account-${section.name}-unavailable'),
        icon: Icons.cloud_off_outlined,
        title: l10n.sectionUnavailableTitle,
        message: l10n.sectionUnavailableMessage,
      ),
    );
  }
}
