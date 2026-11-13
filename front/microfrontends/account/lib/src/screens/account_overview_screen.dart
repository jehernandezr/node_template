import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/account_repository.dart';
import '../l10n/generated/account_localizations.dart';
import '../shared/enums/account_enums.dart';
import '../shared/types/account_types.dart';
import '../shared/utils/account_paths.dart';
import '../widgets/account_widgets.dart';

/// Resumen del perfil con enlaces a las secciones de la cuenta y cierre de sesión.
class AccountOverviewScreen extends StatefulWidget {
  const AccountOverviewScreen({
    super.key,
    required this.repository,
    required this.onSignOut,
  });

  final AccountRepository repository;

  /// Cierra la sesión del usuario. La implementa el shell.
  final Future<void> Function() onSignOut;

  @override
  State<AccountOverviewScreen> createState() => _AccountOverviewScreenState();
}

class _AccountOverviewScreenState extends State<AccountOverviewScreen> {
  AsyncValue<AccountProfile> _profile = const AsyncValue.loading();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final result = await AsyncValue.guard(widget.repository.loadProfile);
    if (!mounted) return;
    setState(() => _profile = result);
  }

  void _reload() {
    setState(() => _profile = const AsyncValue.loading());
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AccountLocalizations.of(context);
    return AppPage(
      title: l10n.overviewTitle,
      body: PlatformScreen(
        compact: (_) => AccountAsyncView<AccountProfile>(
          value: _profile,
          onRetry: _reload,
          data: (profile) => ListView(
            padding: const EdgeInsets.all(AppSpacing.md),
            children: [
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      profile.name,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(profile.email),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      l10n.organizationLine(profile.tenantName),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.md),
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
              _SectionLink(
                title: l10n.securityLinkTitle,
                message: l10n.securityLinkMessage,
                section: AccountSection.security,
              ),
              _SectionLink(
                title: l10n.agreementsLinkTitle,
                message: l10n.agreementsLinkMessage,
                section: AccountSection.agreements,
              ),
              const SizedBox(height: AppSpacing.lg),
              AppButton(
                label: AppLocalizations.of(context).actionSignOut,
                variant: AppButtonVariant.secondary,
                onPressed: () => widget.onSignOut(),
              ),
            ],
          ),
        ),
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
