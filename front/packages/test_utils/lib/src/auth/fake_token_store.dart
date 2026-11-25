import 'dart:async';

import 'package:auth/auth.dart';

/// In-memory session token store that lets you control and count
/// writes.
class FakeTokenStore implements TokenStore {
  FakeTokenStore([this._sessionToken, this.sessionInCookie = false]);

  String? _sessionToken;

  @override
  final bool sessionInCookie;

  /// If not null, [writeSessionToken] waits for it to complete before
  /// storing. Useful to test what happens while the write is pending.
  Completer<void>? writeGate;

  int writeCount = 0;

  /// Stored session token, without going through the async interface.
  String? get sessionToken => _sessionToken;

  @override
  Future<String?> readSessionToken() async => _sessionToken;

  @override
  Future<void> writeSessionToken(String sessionToken) async {
    writeCount++;
    final gate = writeGate;
    if (gate != null) await gate.future;
    _sessionToken = sessionToken;
  }

  @override
  Future<void> clear() async {
    _sessionToken = null;
  }
}
