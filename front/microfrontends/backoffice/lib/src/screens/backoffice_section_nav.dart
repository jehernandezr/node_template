import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import '../l10n/generated/backoffice_localizations.dart';
import '../shared/constants/backoffice_access.dart';
import '../shared/constants/backoffice_paths.dart';
import '../shared/enums/backoffice_enums.dart';

/// Chips of the sections the session can read. The current one is selected,
/// and a detail route (`/backoffice/sagas/s-1`) selects its list; a sibling
/// that only shares a prefix (`/backoffice/sagas2`) does not.
class BackofficeSectionNav extends StatelessWidget {
  /// Navigation between the backoffice sections.
  const BackofficeSectionNav({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    final current = _currentSection(GoRouterState.of(context).uri.path);
    final sections = [
      BackofficeSection.overview,
      BackofficeSection.tenants,
      if (context.can(backofficeOperationsReadAccess)) ...[
        BackofficeSection.sagas,
        BackofficeSection.dlq,
      ],
    ];
    return Semantics(
      container: true,
      label: l10n.navSectionsLabel,
      child: Wrap(
        spacing: AppSpacing.sm,
        runSpacing: AppSpacing.xs,
        children: [
          for (final section in sections)
            ChoiceChip(
              key: Key('backoffice-nav-${section.name}'),
              label: Text(_label(l10n, section)),
              selected: section == current,
              onSelected: (_) => context.go(_path(section)),
            ),
        ],
      ),
    );
  }

  static BackofficeSection _currentSection(String location) {
    for (final section in [
      BackofficeSection.dlq,
      BackofficeSection.sagas,
      BackofficeSection.tenants,
    ]) {
      final path = _path(section);
      if (location == path || location.startsWith('$path/')) return section;
    }
    return BackofficeSection.overview;
  }

  static String _path(BackofficeSection section) => switch (section) {
    BackofficeSection.overview => BackofficePaths.root,
    BackofficeSection.tenants => BackofficePaths.tenants,
    BackofficeSection.sagas => BackofficePaths.sagas,
    BackofficeSection.dlq => BackofficePaths.dlq,
  };

  static String _label(
    BackofficeLocalizations l10n,
    BackofficeSection section,
  ) => switch (section) {
    BackofficeSection.overview => l10n.navOverview,
    BackofficeSection.tenants => l10n.navTenants,
    BackofficeSection.sagas => l10n.navSagas,
    BackofficeSection.dlq => l10n.navDlq,
  };
}
