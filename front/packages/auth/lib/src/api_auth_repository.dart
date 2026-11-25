import 'package:api/api.dart';
import 'package:contracts/contracts.dart';

import 'ports.dart';
import 'session_transport.dart';

/// [AuthRepository] over the identity routes.
///
/// Every call goes through [ApiClient], which validates the request against
/// the contract before touching the network and decodes the response with the
/// generated types.
///
/// Sign-in, refresh and sign-out are public routes and go through [client],
/// which carries no access token: refresh and sign-out are identified by the
/// session token (in the body on mobile, in the httpOnly cookie on the web).
/// Each of those routes carries the [sessionTransport] headers, which tell
/// identity whether the client is a browser or a native app. The step-up
/// requires an open session and goes through [sessionClient], which signs with
/// the session access token.
final class ApiAuthRepository implements AuthRepository {
  /// Creates a repository over [client] that declares [sessionTransport] on
  /// the session routes.
  ///
  /// Without [sessionClient], the step-up uses [client] and, since it has no
  /// token, fails with `PLATFORM.AUTH.UNAUTHENTICATED` without calling the
  /// network.
  ApiAuthRepository(
    this.client, {
    required this.sessionTransport,
    ApiClient? sessionClient,
  }) : sessionClient = sessionClient ?? client;

  /// Client without a session, for the public routes.
  final ApiClient client;

  /// Client with the session access token, for the step-up.
  final ApiClient sessionClient;

  /// How the session token travels: in the browser cookie or in the native
  /// app request body.
  final SessionTransport sessionTransport;

  @override
  Future<SignInResponse> signIn(SignInRequest request) => client.send(
    IdentityRoutes.signIn,
    request,
    headers: sessionTransport.headers,
  );

  @override
  Future<MfaChallenge> requestMfaChallenge(MfaChallengeRequest request) =>
      client.send(IdentityRoutes.requestMfaChallenge, request);

  @override
  Future<SignInResponse> verifyMfa(MfaVerifyRequest request) => client.send(
    IdentityRoutes.verifyMfa,
    request,
    headers: sessionTransport.headers,
  );

  @override
  Future<SessionTokens> refresh({String? sessionToken}) => client.send(
    IdentityRoutes.refreshSession,
    SessionTokenRequest(sessionToken: sessionToken),
    headers: sessionTransport.headers,
  );

  @override
  Future<void> logout({String? sessionToken}) => client.send(
    IdentityRoutes.signOut,
    SessionTokenRequest(sessionToken: sessionToken),
    headers: sessionTransport.headers,
  );

  @override
  Future<PendingMfa> startStepUp() =>
      sessionClient.send(IdentityRoutes.startStepUp, const Empty());

  @override
  Future<MfaChallenge> requestStepUpChallenge(MfaChallengeRequest request) =>
      sessionClient.send(IdentityRoutes.requestStepUpChallenge, request);

  @override
  Future<StepUpResult> verifyStepUp(StepUpVerifyRequest request) =>
      sessionClient.send(IdentityRoutes.verifyStepUp, request);
}
