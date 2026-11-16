import 'package:contracts/contracts.dart';
import 'package:shell_core/shell_core.dart';

import '../shared/enums/account_enums.dart';
import '../shared/types/account_types.dart';
import 'account_repository.dart';

/// In-memory repository with sample data for the demo mode, which serves
/// every capability. Latency, programmed failures and the clock come from
/// [DemoBehavior].
class FakeAccountRepository implements AccountRepository {
  FakeAccountRepository({
    DemoBehavior? behavior,
    AccountProfile? profile,
    List<SessionSummary>? sessions,
    List<DeviceSummary>? devices,
    MfaStatus? mfa,
    List<Passkey>? passkeys,
    List<Agreement>? pendingAgreements,
    List<Agreement>? acceptedAgreements,
  }) : this._(
         behavior ?? DemoBehavior(),
         profile,
         sessions,
         devices,
         mfa,
         passkeys,
         pendingAgreements,
         acceptedAgreements,
       );

  FakeAccountRepository._(
    this._behavior,
    AccountProfile? profile,
    List<SessionSummary>? sessions,
    List<DeviceSummary>? devices,
    MfaStatus? mfa,
    List<Passkey>? passkeys,
    List<Agreement>? pendingAgreements,
    List<Agreement>? acceptedAgreements,
  ) : _profile = profile ?? _sampleProfile(),
      _sessions = List.of(sessions ?? _sampleSessions(_behavior.now())),
      _devices = List.of(devices ?? _sampleDevices(_behavior.now())),
      _mfa = mfa ?? const MfaStatus(enabled: true, method: MfaFactor.totp),
      _passkeys = List.of(passkeys ?? _samplePasskeys(_behavior.now())),
      _pending = List.of(pendingAgreements ?? _samplePending(_behavior.now())),
      _accepted = List.of(
        acceptedAgreements ?? _sampleAccepted(_behavior.now()),
      );

  /// Ids of the sample sessions: the current one, iPhone and Pixel.
  static const List<String> sampleSessionIds = [
    '0193f1c2-0000-7000-8000-000000000001',
    '0193f1c2-0000-7000-8000-000000000002',
    '0193f1c2-0000-7000-8000-000000000003',
  ];

  /// Ids of the sample devices: iPhone and Pixel.
  static const List<String> sampleDeviceIds = [
    '0193f1c2-0000-7000-8000-0000000000d1',
    '0193f1c2-0000-7000-8000-0000000000d2',
  ];

  final DemoBehavior _behavior;
  final AccountProfile _profile;
  final List<SessionSummary> _sessions;
  final List<DeviceSummary> _devices;
  final MfaStatus _mfa;
  final List<Passkey> _passkeys;
  final List<Agreement> _pending;
  final List<Agreement> _accepted;

  @override
  Set<AccountCapability> get capabilities => AccountCapability.values.toSet();

  /// Whether the scope already released this repository.
  bool get isDisposed => _behavior.isDisposed;

  @override
  void dispose() => _behavior.dispose();

  Future<T> _respond<T>(T Function() compute, AccountOperation operation) =>
      _behavior.respond(compute, operation: operation);

  @override
  Future<AccountProfile> loadProfile() =>
      _respond(() => _profile, AccountOperation.loadProfile);

  @override
  Future<List<SessionSummary>> listSessions() =>
      _respond(() => List.of(_sessions), AccountOperation.listSessions);

  @override
  Future<void> revokeSession(String sessionId) => _respond<void>(
    () => _sessions.removeWhere((session) => session.id == sessionId),
    AccountOperation.revokeSession,
  );

  @override
  Future<int> revokeOtherSessions() => _respond<int>(() {
    final before = _sessions.length;
    _sessions.removeWhere((session) => !session.current);
    return before - _sessions.length;
  }, AccountOperation.revokeOtherSessions);

  @override
  Future<List<DeviceSummary>> listDevices() =>
      _respond(() => List.of(_devices), AccountOperation.listDevices);

  @override
  Future<void> removeDeviceTrust(String deviceId) => _respond<void>(
    () => _devices.removeWhere((device) => device.id == deviceId),
    AccountOperation.removeDeviceTrust,
  );

  @override
  Future<SecurityOverview> loadSecurity() => _respond(
    () => SecurityOverview(mfa: _mfa, passkeys: List.of(_passkeys)),
    AccountOperation.loadSecurity,
  );

  @override
  Future<void> addPasskey() => _respond<void>(() {
    final next = _passkeys.length + 1;
    _passkeys.add(
      Passkey(
        id: 'pk-$next',
        name: 'Nueva passkey $next',
        createdAt: _behavior.now(),
      ),
    );
  }, AccountOperation.addPasskey);

  @override
  Future<List<String>> regenerateRecoveryCodes() => _respond(
    () => List.generate(8, (index) => 'AB${100 + index}-CD${200 + index}'),
    AccountOperation.regenerateRecoveryCodes,
  );

  @override
  Future<List<Agreement>> listPendingAgreements() =>
      _respond(() => List.of(_pending), AccountOperation.listPendingAgreements);

  @override
  Future<List<Agreement>> listAcceptedAgreements() => _respond(
    () => List.of(_accepted),
    AccountOperation.listAcceptedAgreements,
  );

  @override
  Future<void> acceptAgreement(String agreementId) => _respond<void>(() {
    final index = _pending.indexWhere(
      (agreement) => agreement.id == agreementId,
    );
    if (index == -1) {
      throw AgreementNotPendingException(agreementId);
    }
    final agreement = _pending.removeAt(index);
    _accepted.insert(0, agreement.markAccepted(_behavior.now()));
  }, AccountOperation.acceptAgreement);

  static AccountProfile _sampleProfile() => const AccountProfile(
    name: 'Ana Pérez',
    email: 'ana@ejemplo.com',
    tenantName: 'Organización demo',
  );

  static List<SessionSummary> _sampleSessions(DateTime now) => [
    SessionSummary(
      id: sampleSessionIds[0],
      deviceName: 'Chrome en MacBook',
      platform: ClientPlatform.web,
      lastSeenAt: now,
      current: true,
    ),
    SessionSummary(
      id: sampleSessionIds[1],
      deviceName: 'Safari en iPhone',
      platform: ClientPlatform.ios,
      lastSeenAt: now.subtract(const Duration(hours: 2)),
      current: false,
    ),
    SessionSummary(
      id: sampleSessionIds[2],
      deviceName: 'App en Pixel 8',
      platform: ClientPlatform.android,
      lastSeenAt: now.subtract(const Duration(days: 2)),
      current: false,
    ),
  ];

  static List<DeviceSummary> _sampleDevices(DateTime now) => [
    DeviceSummary(
      id: sampleDeviceIds[0],
      name: 'Safari en iPhone',
      platform: ClientPlatform.ios,
      lastSeenAt: now.subtract(const Duration(hours: 2)),
      trustedUntil: now.add(const Duration(days: 30)),
      verifier: true,
    ),
    DeviceSummary(
      id: sampleDeviceIds[1],
      name: 'App en Pixel 8',
      platform: ClientPlatform.android,
      lastSeenAt: now.subtract(const Duration(days: 2)),
      trustedUntil: now.add(const Duration(days: 7)),
      verifier: false,
    ),
  ];

  static List<Passkey> _samplePasskeys(DateTime now) => [
    Passkey(
      id: 'pk-0',
      name: 'Passkey de MacBook',
      createdAt: now.subtract(const Duration(days: 30)),
    ),
  ];

  static List<Agreement> _samplePending(DateTime now) => [
    Agreement(
      id: 'ag-privacy',
      title: 'Política de privacidad',
      version: '2.1',
      required: true,
      graceUntil: now.add(const Duration(days: 14)),
    ),
    const Agreement(
      id: 'ag-marketing',
      title: 'Consentimiento de marketing',
      version: '1.0',
      required: false,
    ),
  ];

  static List<Agreement> _sampleAccepted(DateTime now) => [
    Agreement(
      id: 'ag-terms',
      title: 'Términos de servicio',
      version: '3.0',
      required: true,
      acceptedAt: now.subtract(const Duration(days: 120)),
    ),
  ];
}
