import 'dart:math';

import 'package:utils/utils.dart';

/// Generates UUIDv7 strings in creation order: a 48-bit millisecond
/// timestamp, a 12-bit counter for ids created within the same millisecond,
/// and random bits. Sorting the strings sorts them by creation time.
final class UuidV7Generator {
  /// A generator that reads the time from [clock] and the random bits from
  /// [random].
  UuidV7Generator({this._clock = systemClock, Random? random})
    : _random = random ?? Random();

  final Clock _clock;
  final Random _random;
  int _lastMs = 0;
  int _seq = 0;

  /// The next id. Never smaller than the previous one, even if the clock
  /// stands still or goes back.
  String next() {
    var ms = _clock().millisecondsSinceEpoch;
    if (ms <= _lastMs) {
      ms = _lastMs;
      _seq += 1;
      if (_seq > 0xfff) {
        ms = _lastMs + 1;
        _seq = _random.nextInt(0x800);
      }
    } else {
      _seq = _random.nextInt(0x800);
    }
    _lastMs = ms;
    final time = _hex(ms, 12);
    final variant = _hex(0x8 | _random.nextInt(4), 1);
    return '${time.substring(0, 8)}-${time.substring(8)}-'
        '7${_hex(_seq, 3)}-'
        '$variant${_hex(_random.nextInt(0x1000), 3)}-'
        '${_hex(_random.nextInt(0x1000000), 6)}'
        '${_hex(_random.nextInt(0x1000000), 6)}';
  }

  static String _hex(int value, int width) =>
      value.toRadixString(16).padLeft(width, '0');
}
