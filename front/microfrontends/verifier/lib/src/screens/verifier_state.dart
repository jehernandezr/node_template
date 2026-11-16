import 'package:ui/ui.dart';

import '../shared/types/login_challenge.dart';

/// What the verifier shows.
sealed class VerifierState {
  const VerifierState();
}

/// Waiting for the first answer of the repository.
final class VerifierLoading extends VerifierState {
  const VerifierLoading();
}

/// No challenge is pending. [expired] is true when the last challenge ran out
/// of time, so the screen can announce it.
final class VerifierWaiting extends VerifierState {
  const VerifierWaiting({this.expired = false});

  final bool expired;
}

/// A login attempt waits for the user. [code] is the code of this device for
/// it, while it is generated, ready or failed; [secondsLeft] comes from the
/// expiry time of the challenge, never from a counter.
final class VerifierChallenge extends VerifierState {
  const VerifierChallenge({
    required this.challenge,
    required this.code,
    required this.secondsLeft,
    required this.copied,
  });

  final LoginChallenge challenge;
  final AsyncValue<String> code;
  final int secondsLeft;
  final bool copied;

  /// The same challenge with some fields replaced.
  VerifierChallenge copyWith({
    AsyncValue<String>? code,
    int? secondsLeft,
    bool? copied,
  }) => VerifierChallenge(
    challenge: challenge,
    code: code ?? this.code,
    secondsLeft: secondsLeft ?? this.secondsLeft,
    copied: copied ?? this.copied,
  );
}

/// The user confirmed "No fui yo" and the repository is answering. [previous]
/// is what the screen showed, so it keeps drawing the challenge.
final class VerifierDenying extends VerifierState {
  const VerifierDenying(this.previous);

  final VerifierChallenge previous;
}

/// The attempt was blocked. It stays until another challenge arrives.
final class VerifierBlocked extends VerifierState {
  const VerifierBlocked();
}

/// The stream of challenges failed.
final class VerifierFailed extends VerifierState {
  const VerifierFailed(this.error);

  final Object error;
}
