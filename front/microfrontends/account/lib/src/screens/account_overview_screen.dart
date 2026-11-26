import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/account_repository.dart';
import '../l10n/generated/account_localizations.dart';
import '../shared/enums/account_enums.dart';
import '../shared/types/account_types.dart';
import '../shared/utils/account_paths.dart';
import 'account_overview_controller.dart';
import 'widgets/account_widgets.dart';

/// Profile summary with links to the account sections and sign-out. The
/// profile and the sections the repository does not serve are left out.
class AccountOverviewScreen extends StatelessWidget {
  /// Overview of the account backed by [repository].
  const AccountOverviewScreen({
    super.key,
    required this.repository,
    required this.onSignOut,
  });

  /// Source of the profile.
  final AccountRepository repository;

  /// Signs the user out. The shell implements it.
  final Future<void> Function() onSignOut;

  @override
  Widget build(BuildContext context) =>
      ControllerBuilder<AccountOverviewController>(
        create: (context) => AccountOverviewController(repository)..start(),
        builder: (context, controller) => AppPage(
          title: AccountLocalizations.of(context).overviewTitle,
          body: AsyncValueView<AccountProfile?>(
            value: controller.profile,
            errorMessage: AccountLocalizations.of(context).loadError,
            onRetry: controller.start,
            data: (profile) => _OverviewList(
              profile: profile,
              showSecurity: controller.can(AccountCapability.security),
              showAgreements: controller.can(AccountCapability.agreements),
              onSignOut: onSignOut,
            ),
          ),
        ),
      );
}

class _OverviewList extends StatelessWidget {
  const _OverviewList({
    required this.profile,
    required this.showSecurity,
    required this.showAgreements,
    required this.onSignOut,
  });

  final AccountProfile? profile;
  final bool showSecurity;
  final bool showAgreements;
  final Future<void> Function() onSignOut;

  @override
  Widget build(BuildContext context) {
    final l10n = AccountLocalizations.of(context);
    return ContentColumn(
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          if (profile case final profile?) ...[
            _ProfileCard(profile: profile),
            const SizedBox(height: AppSpacing.md),
          ],
          Text(
            l10n.manageSection,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: AppSpacing.sm),
          _SectionLink(
            title: l10n.sessionsTitle,
            message: l10n.sessionsLinkMessage,
            section: AccountSection.sessions,
          ),
          _SectionLink(
            title: l10n.devicesLinkTitle,
            message: l10n.devicesLinkMessage,
            section: AccountSection.devices,
          ),
          if (showSecurity)
            _SectionLink(
              title: l10n.securityLinkTitle,
              message: l10n.securityLinkMessage,
              section: AccountSection.security,
            ),
          if (showAgreements)
            _SectionLink(
              title: l10n.agreementsLinkTitle,
              message: l10n.agreementsLinkMessage,
              section: AccountSection.agreements,
            ),
          const SizedBox(height: AppSpacing.lg),
          AppButton(
            label: AppLocalizations.of(context).actionSignOut,
            variant: AppButtonVariant.secondary,
            onPressed: () => onSignOut(),
          ),
        ],
      ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({required this.profile});

  final AccountProfile profile;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(profile.name, style: theme.textTheme.titleLarge),
          const SizedBox(height: AppSpacing.sm),
          Text(profile.email),
          const SizedBox(height: AppSpacing.xs),
          Text(
            AccountLocalizations.of(context)
                .organizationLine(profile.tenantName),
            style: theme.textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _SectionLink extends StatelessWidget {
  const _SectionLink({
    required this.title,
    required this.message,
    required this.section,
  });

  final String title;
  final String message;
  final AccountSection section;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.sm),
      child: AccountRowCard(
        title: title,
        subtitle: message,
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.go(accountPath(section)),
      ),
    );
  }
}
