import 'dart:async';

import 'package:go_router/go_router.dart';

/// Runs the shell's step-up page as a request with a result, the
/// implementation behind `ShellServices.requestStepUp`.
///
/// [request] pushes the page and completes when the user answers. It also
/// completes, with false, when the page leaves the stack without an answer:
/// go_router only completes the future of a push when the page is popped, so
/// a `go` (a menu entry, a deep link, a sign-out) or a redirect that replaces
/// the stack would otherwise leave the caller waiting forever. [cancel] does
/// the same when the identity changes.
///
/// The page reports the answer with [complete] before it pops: popping
/// removes the page first and the result would arrive after the removal had
/// already been taken as a cancel.
final class StepUpRequests {
  /// Requests for the page at [path].
  StepUpRequests({required this.path});

  /// Path of the step-up page.
  final String path;

  GoRouter? _router;
  Completer<bool>? _pending;

  /// Whether the pending request's page has been on screen. Until then a
  /// location change is not the page leaving.
  bool _shown = false;

  /// Marker passed as `extra` by [request]. The page uses [isRequest] to know
  /// that it must answer with [complete] instead of navigating.
  static const Object _marker = _StepUpRequestMarker();

  /// Whether a page built with [extra] was opened by [request].
  bool isRequest(Object? extra) => identical(extra, _marker);

  /// Whether a request is waiting for an answer.
  bool get isPending => _pending != null;

  /// Starts following [router]. Call it once, after the router exists.
  void attach(GoRouter router) {
    assert(_router == null, 'StepUpRequests is already attached');
    _router = router;
    router.routerDelegate.addListener(_onLocationChanged);
  }

  /// Opens the step-up page and completes with whether the user verified the
  /// second factor. A request made while another one is pending shares it.
  Future<bool> request() {
    final router = _router;
    if (router == null) {
      throw StateError('StepUpRequests.request before attach');
    }
    final pending = _pending;
    if (pending != null) return pending.future;
    final completer = Completer<bool>();
    _pending = completer;
    _shown = false;
    unawaited(
      router
          .push<bool>(path, extra: _marker)
          .then(
            (result) => complete(result ?? false),
            onError: (Object _) {
              complete(false);
            },
          ),
    );
    return completer.future;
  }

  /// Answers the pending request, if any. Later answers are ignored.
  void complete(bool verified) {
    final pending = _pending;
    if (pending == null) return;
    _pending = null;
    _shown = false;
    pending.complete(verified);
  }

  /// Answers the pending request with false.
  void cancel() => complete(false);

  /// Stops following the router and cancels the pending request.
  void dispose() {
    _router?.routerDelegate.removeListener(_onLocationChanged);
    _router = null;
    cancel();
  }

  void _onLocationChanged() {
    final router = _router;
    if (router == null || _pending == null) return;
    // The top page, pushed ones included (`uri` keeps the base location).
    final top = router.routerDelegate.currentConfiguration.lastOrNull;
    final onPage = top?.matchedLocation == path;
    if (onPage) {
      _shown = true;
    } else if (_shown) {
      cancel();
    }
  }
}

final class _StepUpRequestMarker {
  const _StepUpRequestMarker();
}
