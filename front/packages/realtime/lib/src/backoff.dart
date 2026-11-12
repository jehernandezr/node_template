import 'dart:math' as math;

/// Espera entre reintentos: exponencial, con tope y jitter.
///
/// La espera del reintento [attempt] (desde 1) es `initial * multiplier^(attempt-1)`,
/// limitada a [max], y reducida por un factor aleatorio de hasta [jitter].
class RealtimeBackoff {
  RealtimeBackoff({
    this.initial = const Duration(seconds: 1),
    this.max = const Duration(seconds: 30),
    this.multiplier = 2,
    this.jitter = 0.2,
    double Function()? random,
  })  : assert(multiplier >= 1),
        assert(jitter >= 0 && jitter <= 1),
        _random = random ?? math.Random().nextDouble;

  final Duration initial;
  final Duration max;
  final double multiplier;

  /// Fracción máxima que el jitter puede restar a la espera (0 desactiva el jitter).
  final double jitter;

  final double Function() _random;

  Duration delayFor(int attempt) {
    final exponent = attempt < 1 ? 0 : attempt - 1;
    final raw =
        initial.inMicroseconds * math.pow(multiplier, exponent).toDouble();
    final capped = math.min(raw, max.inMicroseconds.toDouble());
    final factor = 1 - jitter * _random();
    return Duration(microseconds: (capped * factor).round());
  }
}
