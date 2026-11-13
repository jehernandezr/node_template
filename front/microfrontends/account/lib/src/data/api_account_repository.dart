import 'dart:async';

import 'package:api/api.dart';
import 'package:contracts/contracts.dart';

import '../shared/constants/account_constants.dart';
import '../shared/types/account_types.dart';
import 'account_repository.dart';

/// Repositorio sobre la API de `identity`.
///
/// Sesiones y dispositivos usan las rutas generadas de [IdentityRoutes] con
/// [ApiClient], que valida cada petición antes de llamar por HTTP. Lo que el
/// contrato aún no cubre (perfil, MFA, passkeys, acuerdos, retirar la
/// confianza de un dispositivo) se delega en [pending] hasta que exista la
/// operación en el backend.
class ApiAccountRepository implements AccountRepository {
  ApiAccountRepository({required this.client, required this.pending});

  final ApiClient client;

  /// Cubre las operaciones sin contrato. Se libera junto con este repositorio.
  final AccountRepository pending;

  /// Recorre las páginas de un listado hasta agotarlas o llegar al tope.
  Future<List<T>> _collect<T>(
    Future<({List<T> items, String? next})> Function(PageQuery query) fetch,
  ) async {
    final all = <T>[];
    String? after;
    for (var page = 0; page < accountMaxPages; page++) {
      final result = await fetch(
        PageQuery(limit: accountPageSize, after: after),
      );
      all.addAll(result.items);
      after = result.next;
      if (after == null) break;
    }
    return all;
  }

  @override
  Future<List<SessionSummary>> listSessions() => _collect((query) async {
    final page = await client.send(IdentityRoutes.listSessions, query);
    return (items: page.items, next: page.nextCursor);
  });

  @override
  Future<void> revokeSession(String sessionId) => client.send(
    IdentityRoutes.revokeSession,
    RevokeSessionRequest(sessionId: sessionId),
  );

  @override
  Future<int> revokeOtherSessions() async {
    final result = await client.send(
      IdentityRoutes.revokeOtherSessions,
      const Empty(),
    );
    return result.revoked;
  }

  @override
  Future<List<DeviceSummary>> listDevices() => _collect((query) async {
    final page = await client.send(IdentityRoutes.listDevices, query);
    return (items: page.items, next: page.nextCursor);
  });

  @override
  Future<void> removeDeviceTrust(String deviceId) =>
      pending.removeDeviceTrust(deviceId);

  @override
  Future<AccountProfile> loadProfile() => pending.loadProfile();

  @override
  Future<SecurityOverview> loadSecurity() => pending.loadSecurity();

  @override
  Future<void> addPasskey() => pending.addPasskey();

  @override
  Future<List<String>> regenerateRecoveryCodes() =>
      pending.regenerateRecoveryCodes();

  @override
  Future<bool> verifyStepUpCode(String code) => pending.verifyStepUpCode(code);

  @override
  Future<List<Agreement>> listPendingAgreements() =>
      pending.listPendingAgreements();

  @override
  Future<List<Agreement>> listAcceptedAgreements() =>
      pending.listAcceptedAgreements();

  @override
  Future<void> acceptAgreement(String agreementId) =>
      pending.acceptAgreement(agreementId);

  @override
  FutureOr<void> dispose() => pending.dispose();
}
