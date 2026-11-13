import 'account_models.dart';
import 'account_repository.dart';

/// Repositorio en memoria con datos de ejemplo y una demora artificial.
class FakeAccountRepository implements AccountRepository {
  FakeAccountRepository({
    this.delay = const Duration(milliseconds: 400),
    AccountProfile? profile,
    List<AppSession>? sessions,
    List<TrustedDevice>? devices,
    MfaStatus? mfa,
    List<Passkey>? passkeys,
    List<Agreement>? pendingAgreements,
    List<Agreement>? acceptedAgreements,
  }) : _profile = profile ?? _sampleProfile(),
       _sessions = List.of(sessions ?? _sampleSessions()),
       _devices = List.of(devices ?? _sampleDevices()),
       _mfa =
           mfa ??
           const MfaStatus(enabled: true, method: 'App de autenticación'),
       _passkeys = List.of(passkeys ?? _samplePasskeys()),
       _pending = List.of(pendingAgreements ?? _samplePending()),
       _accepted = List.of(acceptedAgreements ?? _sampleAccepted());

  /// Código que este repositorio acepta en el paso adicional de MFA.
  static const String validStepUpCode = '123456';

  final Duration delay;
  final AccountProfile _profile;
  final List<AppSession> _sessions;
  final List<TrustedDevice> _devices;
  final MfaStatus _mfa;
  final List<Passkey> _passkeys;
  final List<Agreement> _pending;
  final List<Agreement> _accepted;

  Future<T> _respond<T>(T Function() compute) async {
    await Future<void>.delayed(delay);
    return compute();
  }

  @override
  Future<AccountProfile> loadProfile() => _respond(() => _profile);

  @override
  Future<List<AppSession>> listSessions() => _respond(() => List.of(_sessions));

  @override
  Future<void> revokeSession(String sessionId) => _respond<void>(
    () => _sessions.removeWhere((session) => session.id == sessionId),
  );

  @override
  Future<int> revokeOtherSessions() => _respond<int>(() {
    final before = _sessions.length;
    _sessions.removeWhere((session) => !session.isCurrent);
    return before - _sessions.length;
  });

  @override
  Future<List<TrustedDevice>> listDevices() =>
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
  Future<bool> verifyStepUpCode(String code) =>
      _respond(() => code == validStepUpCode);

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
      throw StateError('El acuerdo $agreementId no está pendiente.');
    }
    final agreement = _pending.removeAt(index);
    _accepted.insert(0, agreement.markAccepted(DateTime.now()));
  });

  static AccountProfile _sampleProfile() => const AccountProfile(
    name: 'Ana Pérez',
    email: 'ana@ejemplo.com',
    tenantName: 'Organización demo',
  );

  static List<AppSession> _sampleSessions() {
    final now = DateTime.now();
    return [
      AppSession(
        id: 's-current',
        deviceName: 'Chrome en MacBook',
        platform: 'Web · macOS',
        lastSeen: now,
        isCurrent: true,
      ),
      AppSession(
        id: 's-iphone',
        deviceName: 'Safari en iPhone',
        platform: 'iOS',
        lastSeen: now.subtract(const Duration(hours: 2)),
      ),
      AppSession(
        id: 's-pixel',
        deviceName: 'App en Pixel 8',
        platform: 'Android',
        lastSeen: now.subtract(const Duration(days: 2)),
      ),
    ];
  }

  static List<TrustedDevice> _sampleDevices() {
    final now = DateTime.now();
    return [
      TrustedDevice(
        id: 'd-iphone',
        name: 'Safari en iPhone',
        platform: 'iOS',
        lastSeen: now.subtract(const Duration(hours: 2)),
        trustedUntil: now.add(const Duration(days: 30)),
        isVerifier: true,
      ),
      TrustedDevice(
        id: 'd-pixel',
        name: 'App en Pixel 8',
        platform: 'Android',
        lastSeen: now.subtract(const Duration(days: 2)),
        trustedUntil: now.add(const Duration(days: 7)),
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
