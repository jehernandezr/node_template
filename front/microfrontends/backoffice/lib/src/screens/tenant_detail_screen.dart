import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/backoffice_repository.dart';
import '../l10n/backoffice_labels.dart';
import '../l10n/generated/backoffice_localizations.dart';
import '../shared/types/backoffice_types.dart';
import 'async_sliver.dart';
import 'audit_timeline.dart';
import 'backoffice_page.dart';
import 'sliver_gap.dart';
import 'tenant_detail_controller.dart';

/// Tenant detail: plan, region, shard group, users count and the audit timeline.
class TenantDetailScreen extends StatelessWidget {
  /// Detail of one tenant with its audit.
  const TenantDetailScreen({
    super.key,
    required this.repository,
    required this.tenantId,
  });

  /// Data source of the screen.
  final BackofficeRepository repository;

  /// Id of the tenant shown.
  final String tenantId;

  @override
  Widget build(BuildContext context) =>
      ControllerBuilder<TenantDetailController>(
        key: ValueKey((repository, tenantId)),
        create: (_) =>
            TenantDetailController(repository, tenantId: tenantId)..start(),
        builder: (context, controller) {
          final l10n = BackofficeLocalizations.of(context);
          return BackofficePage(
            title: l10n.tenantDetailTitle,
            slivers: [
              AsyncSliver<TenantWithAudit>(
                value: controller.detail,
                onRetry: controller.start,
                data: (data) {
                  final tenant = data.tenant;
                  if (tenant == null) {
                    return [
                      SliverToBoxAdapter(
                        child: EmptyState(
                          icon: Icons.business_outlined,
                          title: l10n.notFound,
                        ),
                      ),
                    ];
                  }
                  return [
                    SliverToBoxAdapter(child: _TenantSummary(tenant: tenant)),
                    const SliverGap(AppSpacing.lg),
                    SliverToBoxAdapter(
                      child: Semantics(
                        header: true,
                        child: Text(
                          l10n.auditTitle,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                    ),
                    const SliverGap(AppSpacing.sm),
                    AuditTimeline(entries: data.audit),
                  ];
                },
              ),
            ],
          );
        },
      );
}

class _TenantSummary extends StatelessWidget {
  const _TenantSummary({required this.tenant});

  final Tenant tenant;

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    final theme = Theme.of(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(tenant.name, style: theme.textTheme.titleLarge),
          Text(tenant.id, style: theme.textTheme.bodySmall),
          const SizedBox(height: AppSpacing.sm),
          Chip(label: Text(tenantStatusLabel(l10n, tenant.status))),
          const SizedBox(height: AppSpacing.sm),
          _Fact(l10n.tenantPlanLine(tenant.plan)),
          _Fact(l10n.tenantRegionLine(regionLabel(l10n, tenant.region))),
          _Fact(l10n.tenantShardGroupLine(tenant.shardGroup)),
          _Fact(l10n.tenantUsersLine(tenant.usersCount)),
        ],
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpacing.xs),
    child: Text(text),
  );
}
