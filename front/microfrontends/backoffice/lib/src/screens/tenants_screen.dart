import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/backoffice_repository.dart';
import '../l10n/backoffice_labels.dart';
import '../l10n/generated/backoffice_localizations.dart';
import '../shared/constants/backoffice_paths.dart';
import '../shared/enums/backoffice_enums.dart';
import '../shared/types/backoffice_types.dart';
import 'async_sliver.dart';
import 'backoffice_page.dart';
import 'enum_filter.dart';
import 'sliver_gap.dart';
import 'tenants_controller.dart';

/// Tenant list with search by name or id, and region and status filters.
class TenantsScreen extends StatelessWidget {
  const TenantsScreen({super.key, required this.repository});

  /// Data source of the screen.
  final BackofficeRepository repository;

  @override
  Widget build(BuildContext context) => ControllerBuilder<TenantsController>(
    create: (_) => TenantsController(repository)..start(),
    builder: (context, controller) {
      final l10n = BackofficeLocalizations.of(context);
      return BackofficePage(
        title: l10n.tenantsTitle,
        slivers: [
          SliverToBoxAdapter(
            child: TextField(
              key: const Key('tenant-search'),
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                labelText: l10n.tenantSearchLabel,
                prefixIcon: const Icon(Icons.search),
              ),
              onChanged: controller.search,
            ),
          ),
          const SliverGap(AppSpacing.sm),
          SliverToBoxAdapter(
            child: Wrap(
              spacing: AppSpacing.md,
              runSpacing: AppSpacing.sm,
              children: [
                EnumFilter<TenantRegion>(
                  key: const Key('tenant-region-filter'),
                  label: l10n.filterRegion,
                  allLabel: l10n.filterRegionAll,
                  values: TenantRegion.values,
                  valueLabel: (region) => regionLabel(l10n, region),
                  value: controller.region,
                  onChanged: controller.filterByRegion,
                ),
                EnumFilter<TenantStatus>(
                  key: const Key('tenant-status-filter'),
                  label: l10n.filterStatus,
                  allLabel: l10n.filterStatusAll,
                  values: TenantStatus.values,
                  valueLabel: (status) => tenantStatusLabel(l10n, status),
                  value: controller.status,
                  onChanged: controller.filterByStatus,
                ),
              ],
            ),
          ),
          const SliverGap(AppSpacing.md),
          AsyncSliver<List<Tenant>>(
            value: controller.tenants,
            onRetry: controller.start,
            data: (tenants) => tenants.isEmpty
                ? [
                    SliverToBoxAdapter(
                      child: EmptyState(
                        icon: Icons.search_off,
                        title: l10n.tenantsEmpty,
                      ),
                    ),
                  ]
                : [
                    SliverList.separated(
                      itemCount: tenants.length,
                      separatorBuilder: (_, _) =>
                          const SizedBox(height: AppSpacing.sm),
                      itemBuilder: (context, index) =>
                          _TenantTile(tenant: tenants[index]),
                    ),
                  ],
          ),
        ],
      );
    },
  );
}

class _TenantTile extends StatelessWidget {
  const _TenantTile({required this.tenant});

  final Tenant tenant;

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    final theme = Theme.of(context);
    return AppCard(
      onTap: () => context.go(BackofficePaths.tenant(tenant.id)),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(tenant.name, style: theme.textTheme.titleMedium),
                MetaLine(
                  parts: [
                    tenant.id,
                    regionLabel(l10n, tenant.region),
                    tenant.plan,
                  ],
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Chip(label: Text(tenantStatusLabel(l10n, tenant.status))),
        ],
      ),
    );
  }
}
