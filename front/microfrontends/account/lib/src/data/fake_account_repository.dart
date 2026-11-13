import 'package:contracts/contracts.dart';

import '../shared/types/account_types.dart';
import 'account_repository.dart';

const List<String> _sessionIds = [
  '0193f1c2-0000-7000-8000-000000000001',
  '0193f1c2-0000-7000-8000-000000000002',
  '0193f1c2-0000-7000-8000-000000000003',
];

const List<String> _deviceIds = [
  '0193f1c2-0000-7000-8000-0000000000d1',
  '0193f1c2-0000-7000-8000-0000000000d2',
];

/// Repositorio en memoria con datos de ejemplo y una demora artificial.
class FakeAccountRepository implements AccountRepository {
  FakeAccountRepository({
    this.delay = const Duration(milliseconds: 400),
    AccountProfile? profile,
    List<SessionSummary>? sessions,
    List<DeviceSummary>? devices,
    MfaStatus? mfa,
    List<Passkey>? passkeys,
    List<Agreement>? pendingAgreements,
    List<Agreement>? acceptedAgreements,
  }) : _profile = profile ?? _sampleProfile(),
       _sessions = List.of(sessions ?? _sampleSessions()),
       _devices = List.of(devices ?? _sampleDevices()),
       _mfa = mfa ?? const MfaStatus(enabled: true, method: MfaFactor.totp),
       _passkeys = List.of(passkeys ?? _samplePasskeys()),
       _pending = List.of(pendingAgreements ?? _samplePending()),
       _accepted = List.of(acceptedAgreements ?? _sampleAccepted());

  /// Ids de las sesiones de ejemplo: la actual, iPhone y Pixel.
  static const List<String> sampleSessionIds = _sessionIds;

  /// Ids de los dispositivos de ejemplo: iPhone y Pixel.
  static const List<String> sampleDeviceIds = _deviceIds;

  final Duration delay;
  final AccountProfile _profile;
  final List<SessionSummary> _sessions;
  final List<DeviceSummary> _devices;
  final MfaStatus _mfa;
  final List<Passkey> _passkeys;
  final List<Agreement> _pending;
  final List<Agreement> _accepted;

  bool _disposed = false;

  /// Si el scope ya liberó este repositorio.
  bool get isDisposed => _disposed;

  @override
  void dispose() => _disposed = true;

  Future<T> _respond<T>(T Function() compute) async {
    await Future<void>.delayed(delay);
    return compute();
  }

  @override
  Future<AccountProfile> loadProfile() => _respond(() => _profile);

  @override
  Future<List<SessionSummary>> listSessions() =>
      _respond(() => List.of(_sessions));

  @override
  Future<void> revokeSession(String sessionId) => _respond<void>(
    () => _sessions.removeWhere((session) => session.id == sessionId),
  );

  @override
  Future<int> revokeOtherSessions() => _respond<int>(() {
    final before = _sessions.length;
    _sessions.removeWhere((session) => !session.current);
    return before - _sessions.length;
  });

  @override
  Future<List<DeviceSummary>> listDevices() =>
      _respond(() => List.of(_devices));

  @override
  Future<void> removeDeviceTrust(String deviceId) => _respond<void>(
    () => _devices.removeWhere((device) => device.id == deviceId),
  );

  @override
  Future<SecurityOverview> loadSecurity() =>
      _respond(() => SecurityOverview(mfa: _mfa, passkeys: List.of(_passkeys)));

  @override
  Future<void> addPasskey() => _respond<void>(() {
    final next = _passkeys.length + 1;
    _passkeys.add(
      Passkey(
        id: 'pk-$next',
        name: 'Nueva passkey $next',
        createdAt: DateTime.now(),
      ),
    );
  });

  @override
  Future<List<String>> regenerateRecoveryCodes() => _respond(
    () => List.generate(8, (index) => 'AB${100 + index}-CD${200 + index}'),
  );

  @override
  Future<List<Agreement>> listPendingAgreements() =>
      _respond(() => List.of(_pending));

  @override
  Future<List<Agreement>> listAcceptedAgreements() =>
      _respond(() => List.of(_accepted));

  @override
  Future<void> acceptAgreement(String agreementId) => _respond<void>(() {
    final index = _pending.indexWhere(
      (agreement) => agreement.id == agreementId,
    );
    if (index == -1) {
      throw AgreementNotPendingException(agreementId);
    }
    final agreement = _pending.removeAt(index);
    _accepted.insert(0, agreement.markAccepted(DateTime.now()));
  });

  static AccountProfile _sampleProfile() => const AccountProfile(
    name: 'Ana Pérez',
    email: 'ana@ejemplo.com',
    tenantName: 'Organización demo',
  );

  static List<SessionSummary> _sampleSessions() {
    final now = DateTime.now();
    return [
      SessionSummary(
        id: _sessionIds[0],
        deviceName: 'Chrome en MacBook',
        platform: ClientPlatform.web,
        lastSeenAt: now,
        current: true,
      ),
      SessionSummary(
        id: _sessionIds[1],
        deviceName: 'Safari en iPhone',
        platform: ClientPlatform.ios,
        lastSeenAt: now.subtract(const Duration(hours: 2)),
        current: false,
      ),
      SessionSummary(
        id: _sessionIds[2],
        deviceName: 'App en Pixel 8',
        platform: ClientPlatform.android,
        lastSeenAt: now.subtract(const Duration(days: 2)),
        current: false,
      ),
    ];
  }

  static List<DeviceSummary> _sampleDevices() {
    final now = DateTime.now();
    return [
      DeviceSummary(
        id: _deviceIds[0],
        name: 'Safari en iPhone',
        platform: ClientPlatform.ios,
        lastSeenAt: now.subtract(const Duration(hours: 2)),
        trustedUntil: now.add(const Duration(days: 30)),
        verifier: true,
      ),
      DeviceSummary(
        id: _deviceIds[1],
        name: 'App en Pixel 8',
        platform: ClientPlatform.android,
        lastSeenAt: now.subtract(const Duration(days: 2)),
        trustedUntil: now.add(const Duration(days: 7)),
        verifier: false,
      ),
    ];
  }

  static List<Passkey> _samplePasskeys() => [
    Passkey(
      id: 'pk-0',
      name: 'Passkey de MacBook',
      createdAt: DateTime.now().subtract(const Duration(days: 30)),
    ),
  ];

  static List<Agreement> _samplePending() {
    final now = DateTime.now();
    return [
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
  }

  static List<Agreement> _sampleAccepted() => [
    Agreement(
      id: 'ag-terms',
      title: 'Términos de servicio',
      version: '3.0',
      required: true,
      acceptedAt: DateTime.now().subtract(const Duration(days: 120)),
    ),
  ];
}
