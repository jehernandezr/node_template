import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/account_models.dart';
import '../data/account_repository.dart';
import '../l10n/generated/account_localizations.dart';
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
  late Future<AccountProfile> _profile = widget.repository.loadProfile();

  void _reload() {
    setState(() {
      _profile = widget.repository.loadProfile();
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AccountLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.overviewTitle)),
      body: PlatformScreen(
        compact: (_) => AsyncView<AccountProfile>(
          future: _profile,
          onRetry: _reload,
          builder: (context, profile) => ListView(
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
                path: '/account/sessions',
              ),
              _SectionLink(
                title: l10n.devicesLinkTitle,
                message: l10n.devicesLinkMessage,
                path: '/account/devices',
              ),
              _SectionLink(
                title: l10n.securityLinkTitle,
                message: l10n.securityLinkMessage,
                path: '/account/security',
              ),
              _SectionLink(
                title: l10n.agreementsLinkTitle,
                message: l10n.agreementsLinkMessage,
                path: '/account/agreements',
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
    required this.path,
  });

  final String title;
  final String message;
  final String path;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.sm),
      child: AccountRowCard(
        title: title,
        subtitle: message,
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.go(path),
      ),
    );
  }
}
