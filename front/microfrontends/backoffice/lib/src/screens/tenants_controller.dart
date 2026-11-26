import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/backoffice_repository.dart';
import '../shared/enums/backoffice_enums.dart';
import '../shared/types/backoffice_types.dart';

/// State of the tenant list: the search text, the filters and the result.
final class TenantsController extends ChangeNotifier {
  /// Controller over [repository]; call `start` once.
  TenantsController(BackofficeRepository repository)
    : _repository = repository {
    _loader = AsyncLoader<List<Tenant>>(
      () => _repository.listTenants(
        query: _query,
        region: _region,
        status: _status,
      ),
    );
    _loader.addListener(notifyListeners);
  }

  final BackofficeRepository _repository;
  late final AsyncLoader<List<Tenant>> _loader;

  String _query = '';
  TenantRegion? _region;
  TenantStatus? _status;

  /// Text typed in the search field.
  String get query => _query;

  /// Selected region, or null for all.
  TenantRegion? get region => _region;

  /// Selected status, or null for all.
  TenantStatus? get status => _status;

  /// Tenants matching the search and the filters.
  AsyncValue<List<Tenant>> get tenants => _loader.value;

  /// Loads the list with the current search and filters; also the retry.
  Future<void> start() => _loader.load();

  /// Sets the search text and reloads.
  Future<void> search(String query) {
    _query = query;
    return _loader.load();
  }

  /// Sets the region filter and reloads.
  Future<void> filterByRegion(TenantRegion? region) {
    _region = region;
    return _loader.load();
  }

  /// Sets the status filter and reloads.
  Future<void> filterByStatus(TenantStatus? status) {
    _status = status;
    return _loader.load();
  }

  @override
  void dispose() {
    _loader.dispose();
    super.dispose();
  }
}
