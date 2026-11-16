import 'dart:async';

import 'package:auth/auth.dart';

/// Almacén del session token en memoria que deja controlar y contar las
/// escrituras.
class FakeTokenStore implements TokenStore {
  FakeTokenStore([this._sessionToken, this.sessionInCookie = false]);

  String? _sessionToken;

  @override
  final bool sessionInCookie;

  /// Si no es null, [writeSessionToken] espera a que se complete antes de
  /// guardar. Sirve para probar lo que pasa mientras la escritura está pendiente.
  Completer<void>? writeGate;

  int writeCount = 0;

  /// Session token guardado, sin pasar por la interfaz asíncrona.
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
