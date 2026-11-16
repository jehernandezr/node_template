import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart';

import '../data/verifier_repository.dart';
import '../shared/constants/verifier_constants.dart';
import '../shared/types/login_challenge.dart';
import 'verifier_state.dart';

/// State of the verifier: follows the pending challenge, counts down to its
/// expiry and denies it.
final class VerifierController extends ChangeNotifier {
  /// Controller over [repository]. [tick] is the period of the countdown;
  /// [clock] and the expiry time of the challenge give the seconds left, so a
  /// backgrounded app does not drift. Call [start] once.
  VerifierController(
    this._repository, {
    required this.clock,
    this.tick = verifierTick,
  });

  final VerifierRepository _repository;

  /// Time source of the countdown.
  final Clock clock;

  /// Period of the countdown.
  final Duration tick;

  final ActionRunner _runner = ActionRunner();
  StreamSubscription<LoginChallenge?>? _subscription;
  Timer? _ticker;

  /// Code of the current challenge. A new challenge replaces it, so the late
  /// answer for an older challenge is never shown.
  AsyncLoader<String>? _codeLoader;
  LoginChallenge? _active;
  DateTime? _expiresAt;
  VerifierState _state = const VerifierLoading();
  bool _disposed = false;

  /// Current state.
  VerifierState get state => _state;

  /// Subscribes to the pending challenges. Also the retry after
  /// [VerifierFailed].
  Future<void> start() async {
    if (_disposed) return;
    final previous = _subscription;
    _subscription = null;
    unawaited(previous?.cancel());
    _dropChallenge();
    _state = const VerifierLoading();
    _notify();
    _subscription = _repository.pending().listen(
      _onChallenge,
      onError: _onError,
    );
  }

  /// Denies the pending challenge: [VerifierDenying], then [VerifierBlocked],
  /// or back to the challenge when it fails.
  Future<ActionResult<void>> deny() async {
    final current = _state;
    if (current is! VerifierChallenge) return const ActionSkipped<void>();
    final challenge = _active!;
    _state = VerifierDenying(current);
    _notify();
    final result = await _runner.run<void>(
      () => _repository.deny(challenge.id),
    );
    if (_disposed || !identical(_active, challenge)) return result;
    if (result is ActionSucceeded<void>) {
      _dropChallenge();
      _state = const VerifierBlocked();
    } else {
      final denying = _state;
      if (denying is VerifierDenying) _state = denying.previous;
    }
    _notify();
    return result;
  }

  /// Marks the code as copied until the next challenge.
  void markCopied() {
    final current = _state;
    if (current is! VerifierChallenge || current.copied) return;
    _state = current.copyWith(copied: true);
    _notify();
  }

  void _onChallenge(LoginChallenge? challenge) {
    if (challenge == null) {
      final current = _state;
      if (current is VerifierDenying || current is VerifierBlocked) return;
      _dropChallenge();
      _state = const VerifierWaiting();
      _notify();
      return;
    }
    _dropChallenge();
    _active = challenge;
    _expiresAt = clock().add(challenge.validFor);
    final loader = AsyncLoader<String>(
      () => _repository.autoCode(challenge.id),
    );
    _codeLoader = loader;
    loader.addListener(() => _onCode(loader));
    _state = VerifierChallenge(
      challenge: challenge,
      code: loader.value,
      secondsLeft: challenge.validFor.inSeconds,
      copied: false,
    );
    _ticker = Timer.periodic(tick, (_) => _onTick());
    _notify();
    unawaited(loader.load());
  }

  void _onCode(AsyncLoader<String> loader) {
    if (!identical(loader, _codeLoader)) return;
    final current = _state;
    if (current is VerifierChallenge) {
      _state = current.copyWith(code: loader.value);
    } else if (current is VerifierDenying) {
      _state = VerifierDenying(current.previous.copyWith(code: loader.value));
    } else {
      return;
    }
    _notify();
  }

  void _onTick() {
    if (_expiresAt!.difference(clock()) <= Duration.zero) {
      _dropChallenge();
      _state = const VerifierWaiting(expired: true);
      _notify();
      return;
    }
    final seconds = _secondsLeft();
    final current = _state;
    if (current is VerifierChallenge) {
      if (current.secondsLeft == seconds) return;
      _state = current.copyWith(secondsLeft: seconds);
    } else if (current is VerifierDenying) {
      if (current.previous.secondsLeft == seconds) return;
      _state = VerifierDenying(current.previous.copyWith(secondsLeft: seconds));
    } else {
      return;
    }
    _notify();
  }

  void _onError(Object error, StackTrace stackTrace) {
    _dropChallenge();
    _state = VerifierFailed(error);
    _notify();
  }

  /// Seconds up to the expiry time, rounded up. It comes from the clock, not
  /// from a counter, so a jump of the clock shows at the next tick.
  int _secondsLeft() {
    final remaining = _expiresAt!.difference(clock());
    final seconds = (remaining.inMilliseconds + 999) ~/ 1000;
    return seconds < 0 ? 0 : seconds;
  }

  void _dropChallenge() {
    _ticker?.cancel();
    _ticker = null;
    _codeLoader?.dispose();
    _codeLoader = null;
    _active = null;
    _expiresAt = null;
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    unawaited(_subscription?.cancel());
    _dropChallenge();
    _runner.dispose();
    super.dispose();
  }
}
