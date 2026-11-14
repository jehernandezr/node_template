import 'dart:math' as math;

import '../constants/verifier_constants.dart';

/// Turns a signature into a code of [verifierCodeLength] digits: the first
/// four bytes as a big-endian number, modulo 10^length, left-padded with
/// zeros.
String codeFromSignature(List<int> signature) {
  var value = 0;
  for (final byte in signature.take(4)) {
    value = (value << 8) | (byte & 0xff);
  }
  final modulus = math.pow(10, verifierCodeLength).toInt();
  return (value % modulus).toString().padLeft(verifierCodeLength, '0');
}

/// Groups a code in blocks of [verifierCodeGroupSize], e.g. `1234 5678`.
/// A value that is not a full code is returned unchanged.
String groupCode(String code) {
  if (code.length != verifierCodeLength) return code;
  return '${code.substring(0, verifierCodeGroupSize)} '
      '${code.substring(verifierCodeGroupSize)}';
}

/// Formats seconds as mm:ss.
String formatCountdown(int seconds) {
  final safe = seconds < 0 ? 0 : seconds;
  final minutes = (safe ~/ 60).toString().padLeft(2, '0');
  final rest = (safe % 60).toString().padLeft(2, '0');
  return '$minutes:$rest';
}
