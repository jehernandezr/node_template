import 'package:api/api.dart';
import 'package:contracts/contracts.dart';

import '../shared/constants/account_constants.dart';
import '../shared/enums/account_enums.dart';
import '../shared/types/account_types.dart';
import 'account_repository.dart';

/// Repositorio sobre la API de `identity`.
///
/// Sesiones y dispositivos usan las rutas generadas de [IdentityRoutes] con
/// [ApiClient], que valida cada petición antes de llamar por HTTP. Lo que el
/// contrato aún no cubre (perfil, confianza de dispositivos, seguridad,
/// acuerdos) no está en [capabilities] y lanza [UnsupportedError]: nunca
/// responde datos inventados como si vinieran del servidor.
class ApiAccountRepository implements AccountRepository {
  ApiAccountRepository({required this.client});

  final ApiClient client;

  @override
  Set<AccountCapability> get capabilities => const {};

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
      _unsupported(AccountCapability.deviceTrust);

  @override
  Future<AccountProfile> loadProfile() =>
      _unsupported(AccountCapability.profile);

  @override
  Future<SecurityOverview> loadSecurity() =>
      _unsupported(AccountCapability.security);

  @override
  Future<void> addPasskey() => _unsupported(AccountCapability.security);

  @override
  Future<List<String>> regenerateRecoveryCodes() =>
      _unsupported(AccountCapability.security);

  @override
  Future<List<Agreement>> listPendingAgreements() =>
      _unsupported(AccountCapability.agreements);

  @override
  Future<List<Agreement>> listAcceptedAgreements() =>
      _unsupported(AccountCapability.agreements);

  @override
  Future<void> acceptAgreement(String agreementId) =>
      _unsupported(AccountCapability.agreements);

  @override
  void dispose() {}

  static Future<T> _unsupported<T>(AccountCapability capability) =>
      Future<T>.error(
        UnsupportedError(
          'identity no tiene contrato para ${capability.name} todavía',
        ),
      );
}
