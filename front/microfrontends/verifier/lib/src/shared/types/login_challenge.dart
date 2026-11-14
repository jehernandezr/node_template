/// Where and how a login attempt was started, shown so the user can judge it.
final class LoginAttemptContext {
  /// Creates the context of one attempt.
  const LoginAttemptContext({
    required this.browser,
    required this.os,
    required this.city,
    required this.ip,
  });

  /// Browser or app that started the attempt, e.g. `Chrome 128`.
  final String browser;

  /// Operating system of the attempting device, e.g. `Windows 11`.
  final String os;

  /// Approximate city derived from the IP address.
  final String city;

  /// IP address the attempt came from.
  final String ip;
}

/// A login attempt from a new device that waits for approval on this device.
final class LoginChallenge {
  /// Creates a pending challenge.
  const LoginChallenge({
    required this.id,
    required this.context,
    required this.validFor,
  });

  /// Identifier of the challenge on the server.
  final String id;

  /// Context of the attempt.
  final LoginAttemptContext context;

  /// How long the code stays usable, counted from when the device received
  /// the challenge.
  final Duration validFor;
}
