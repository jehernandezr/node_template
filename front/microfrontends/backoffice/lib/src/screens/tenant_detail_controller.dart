import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/backoffice_repository.dart';
import '../shared/types/backoffice_types.dart';

/// State of the tenant detail: the tenant and its audit log.
///
/// Future.wait keeps the original error; a record of futures would wrap it in a ParallelWaitError, which is an Error and escapes the loader.
final class TenantDetailController extends ChangeNotifier {
  /// Controller of one tenant over [repository].
  TenantDetailController(
    BackofficeRepository repository, {
    required String tenantId,
  }) : _repository = repository {
    _loader = AsyncLoader<TenantWithAudit>(() => _fetch(tenantId));
    _loader.addListener(notifyListeners);
  }

  final BackofficeRepository _repository;
  late final AsyncLoader<TenantWithAudit> _loader;

  /// The tenant (null inside when it does not exist) and its audit log.
  AsyncValue<TenantWithAudit> get detail => _loader.value;

  /// Loads both in parallel; also the retry.
  Future<void> start() => _loader.load();

  Future<TenantWithAudit> _fetch(String tenantId) async {
    final tenant = _repository.tenant(tenantId);
    final audit = _repository.tenantAudit(tenantId);
    await Future.wait<Object?>([tenant, audit]);
    return TenantWithAudit(tenant: await tenant, audit: await audit);
  }

  @override
  void dispose() {
    _loader.dispose();
    super.dispose();
  }
}
