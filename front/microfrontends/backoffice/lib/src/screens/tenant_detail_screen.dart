import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/backoffice_repository.dart';
import '../l10n/backoffice_labels.dart';
import '../l10n/generated/backoffice_localizations.dart';
import '../shared/types/backoffice_types.dart';
import 'widgets.dart';

/// Tenant detail: plan, shard group, users count and the audit timeline.
class TenantDetailScreen extends StatefulWidget {
  const TenantDetailScreen({
    super.key,
    required this.tenantId,
    required this.repository,
  });

  final String tenantId;

  /// Data source of the screen.
  final BackofficeRepository repository;

  @override
  State<TenantDetailScreen> createState() => _TenantDetailScreenState();
}

typedef _TenantData = ({Tenant? tenant, List<AuditEntry> audit});

class _TenantDetailScreenState extends State<TenantDetailScreen> {
  late Future<_TenantData> _data = _load();

  void _reload() => setState(() {
    _data = _load();
  });

  Future<_TenantData> _load() async {
    final tenant = await widget.repository.tenant(widget.tenantId);
    final audit = await widget.repository.tenantAudit(widget.tenantId);
    return (tenant: tenant, audit: audit);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    return BackofficePage(
      title: l10n.tenantDetailTitle,
      child: AsyncBody<_TenantData>(
        future: _data,
        onRetry: _reload,
        builder: (context, data) {
          final tenant = data.tenant;
          if (tenant == null) {
            return EmptyState(
              icon: Icons.business_outlined,
              title: l10n.notFound,
            );
          }
          final theme = Theme.of(context);
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(tenant.name, style: theme.textTheme.titleLarge),
                    Text(tenant.id, style: theme.textTheme.bodySmall),
                    const SizedBox(height: AppSpacing.sm),
                    Chip(label: Text(tenantStatusLabel(l10n, tenant.status))),
                    const SizedBox(height: AppSpacing.sm),
                    _Fact(label: l10n.tenantPlan, value: tenant.plan),
                    _Fact(
                      label: l10n.tenantRegion,
                      value: regionLabel(l10n, tenant.region),
                    ),
                    _Fact(
                      label: l10n.tenantShardGroup,
                      value: tenant.shardGroup,
                    ),
                    _Fact(
                      label: l10n.tenantUsers,
                      value: '${tenant.usersCount}',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(l10n.auditTitle, style: theme.textTheme.titleMedium),
              const SizedBox(height: AppSpacing.sm),
              AuditTimeline(entries: data.audit),
            ],
          );
        },
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpacing.xs),
    child: Text('$label: $value'),
  );
}
