import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/backoffice_models.dart';
import '../data/backoffice_repository.dart';
import '../l10n/generated/backoffice_localizations.dart';
import '../labels.dart';
import 'backoffice_page.dart';

/// Tenant list with search by name or id, and region and status filters.
class TenantsScreen extends StatefulWidget {
  const TenantsScreen({super.key, required this.repository});

  /// Data source of the screen.
  final BackofficeRepository repository;

  @override
  State<TenantsScreen> createState() => _TenantsScreenState();
}

class _TenantsScreenState extends State<TenantsScreen> {
  String _query = '';
  TenantRegion? _region;
  TenantStatus? _status;
  late Future<List<Tenant>> _tenants = _load();

  Future<List<Tenant>> _load() => widget.repository.listTenants(
    query: _query,
    region: _region,
    status: _status,
  );

  void _reload() {
    setState(() {
      _tenants = _load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    return BackofficePage(
      title: l10n.tenantsTitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            key: const Key('tenant-search'),
            decoration: InputDecoration(
              labelText: l10n.tenantSearchLabel,
              prefixIcon: const Icon(Icons.search),
            ),
            onChanged: (value) {
              _query = value;
              _reload();
            },
          ),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.md,
            runSpacing: AppSpacing.sm,
            children: [
              _RegionFilter(
                value: _region,
                onChanged: (value) {
                  _region = value;
                  _reload();
                },
              ),
              _StatusFilter(
                value: _status,
                onChanged: (value) {
                  _status = value;
                  _reload();
                },
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          AsyncBody<List<Tenant>>(
            future: _tenants,
            builder: (context, tenants) {
              if (tenants.isEmpty) {
                return EmptyState(
                  icon: Icons.search_off,
                  title: l10n.tenantsEmpty,
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final tenant in tenants) _TenantTile(tenant: tenant),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _RegionFilter extends StatelessWidget {
  const _RegionFilter({required this.value, required this.onChanged});

  final TenantRegion? value;
  final ValueChanged<TenantRegion?> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    return DropdownButton<TenantRegion?>(
      key: const Key('tenant-region-filter'),
      value: value,
      items: [
        DropdownMenuItem<TenantRegion?>(
          value: null,
          child: Text('${l10n.filterRegion}: ${l10n.filterAll}'),
        ),
        for (final region in TenantRegion.values)
          DropdownMenuItem<TenantRegion?>(
            value: region,
            child: Text(regionLabel(l10n, region)),
          ),
      ],
      onChanged: onChanged,
    );
  }
}

class _StatusFilter extends StatelessWidget {
  const _StatusFilter({required this.value, required this.onChanged});

  final TenantStatus? value;
  final ValueChanged<TenantStatus?> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    return DropdownButton<TenantStatus?>(
      key: const Key('tenant-status-filter'),
      value: value,
      items: [
        DropdownMenuItem<TenantStatus?>(
          value: null,
          child: Text('${l10n.filterStatus}: ${l10n.filterAll}'),
        ),
        for (final status in TenantStatus.values)
          DropdownMenuItem<TenantStatus?>(
            value: status,
            child: Text(tenantStatusLabel(l10n, status)),
          ),
      ],
      onChanged: onChanged,
    );
  }
}

class _TenantTile extends StatelessWidget {
  const _TenantTile({required this.tenant});

  final Tenant tenant;

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: AppCard(
        onTap: () => context.go('/backoffice/tenants/${tenant.id}'),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    tenant.name,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Text(
                    '${tenant.id} · ${regionLabel(l10n, tenant.region)} · ${tenant.plan}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            Chip(label: Text(tenantStatusLabel(l10n, tenant.status))),
          ],
        ),
      ),
    );
  }
}
