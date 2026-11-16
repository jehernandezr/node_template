import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/billing_repository.dart';
import '../shared/types/billing_types.dart';
import 'change_plan_state.dart';

/// State and actions of the change-plan sheet.
final class ChangePlanController extends ChangeNotifier {
  /// Creates the controller for the subscription on `currentPlanId`.
  ChangePlanController(this._repository, {required this.currentPlanId});

  final BillingRepository _repository;

  /// Plan in force: it cannot be selected.
  final String currentPlanId;
  final ActionRunner _runner = ActionRunner();

  ChangePlanState _state = const ChangePlanLoading();
  int _requestId = 0;
  bool _disposed = false;

  /// Current step of the sheet: loading, choosing, saving, failed or done.
  ChangePlanState get state => _state;

  /// Whether [confirm] would save something now.
  bool get canConfirm =>
      _plans != null && _selectedId != null && _selectedId != currentPlanId;

  /// Plans shown in the list, or null while there are none.
  List<Plan>? get _plans => switch (_state) {
    ChangePlanChoosing(:final plans) => plans,
    ChangePlanFailed(:final plans) when plans.isNotEmpty => plans,
    _ => null,
  };

  /// Plan picked so far, or null.
  String? get _selectedId => switch (_state) {
    ChangePlanChoosing(:final selectedId) => selectedId,
    ChangePlanFailed(:final selectedId) => selectedId,
    _ => null,
  };

  /// Loads the available plans. Calling it again reloads.
  Future<void> start() async {
    final id = ++_requestId;
    _emit(const ChangePlanLoading());
    final result = await AsyncValue.guard(_repository.availablePlans);
    if (_disposed || id != _requestId) return;
    _emit(
      result.when<ChangePlanState>(
        loading: () => const ChangePlanLoading(),
        data: (plans) => ChangePlanChoosing(plans, null),
        error: (error) => ChangePlanFailed(const [], null, error),
      ),
    );
  }

  /// Picks [planId]. Ignored for the current plan and while saving.
  void select(String planId) {
    final plans = _plans;
    if (plans == null || planId == currentPlanId) return;
    _emit(ChangePlanChoosing(plans, planId));
  }

  /// Saves the selected plan. Skipped when nothing is selected or a save is
  /// running.
  Future<ActionResult<Subscription>> confirm() async {
    if (!canConfirm) return ActionSkipped<Subscription>();
    final plans = _plans!;
    final id = _selectedId!;
    _emit(ChangePlanSaving(plans, id));
    final result = await _runner.run(() => _repository.changePlan(id));
    if (_disposed) return result;
    _emit(switch (result) {
      ActionSucceeded<Subscription>() => const ChangePlanDone(),
      ActionFailed<Subscription>(:final error) => ChangePlanFailed(
        plans,
        id,
        error,
      ),
      ActionSkipped<Subscription>() => ChangePlanChoosing(plans, id),
    });
    return result;
  }

  void _emit(ChangePlanState next) {
    _state = next;
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _runner.dispose();
    super.dispose();
  }
}
