import 'dart:async';

import 'package:flutter/foundation.dart';

/// Outcome of [ActionRunner.run].
sealed class ActionResult<T> {
  /// Base constructor for the closed set of outcomes.
  const ActionResult();
}

/// The action finished and returned [value].
final class ActionSucceeded<T> extends ActionResult<T> {
  /// Creates the success outcome.
  const ActionSucceeded(this.value);

  /// What the action returned.
  final T value;
}

/// The action threw an [Exception].
final class ActionFailed<T> extends ActionResult<T> {
  /// Creates the failure outcome.
  const ActionFailed(this.error, [this.stackTrace]);

  /// What was thrown.
  final Object error;

  /// Where it was thrown, when known.
  final StackTrace? stackTrace;
}

/// The action did not run: the runner was busy or a precondition (a step-up)
/// was declined.
final class ActionSkipped<T> extends ActionResult<T> {
  /// Creates the skipped outcome.
  const ActionSkipped();
}

/// What to do with a call made while another one is running.
enum ActionConcurrency {
  /// Every call runs right away.
  parallel,

  /// Each call waits for the previous ones and runs after them.
  serial,

  /// A call made while another runs is skipped.
  dropWhileRunning,
}

/// Runs the actions of the user without a `BuildContext` and returns a closed
/// result. Listeners hear when [isRunning] changes.
final class ActionRunner extends ChangeNotifier {
  /// Creates a runner with the given [concurrency].
  ActionRunner({this.concurrency = ActionConcurrency.dropWhileRunning});

  /// What happens to a call made while another one is running.
  final ActionConcurrency concurrency;

  int _pending = 0;
  bool _disposed = false;
  Future<void> _tail = Future<void>.value();

  /// Whether at least one action is running or waiting its turn.
  bool get isRunning => _pending > 0;

  /// Runs [action]. An [Exception] becomes [ActionFailed]; an [Error] escapes.
  Future<ActionResult<T>> run<T>(Future<T> Function() action) async {
    if (concurrency == ActionConcurrency.dropWhileRunning && _pending > 0) {
      return ActionSkipped<T>();
    }
    _start();
    Completer<void>? turn;
    try {
      if (concurrency == ActionConcurrency.serial) {
        final previous = _tail;
        turn = Completer<void>();
        _tail = turn.future;
        await previous;
      }
      return ActionSucceeded<T>(await action());
    } on Exception catch (error, stackTrace) {
      return ActionFailed<T>(error, stackTrace);
    } finally {
      _finish();
      turn?.complete();
    }
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }

  void _start() {
    _pending++;
    if (_pending == 1) _notify();
  }

  void _finish() {
    _pending--;
    if (_pending == 0) _notify();
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }
}
