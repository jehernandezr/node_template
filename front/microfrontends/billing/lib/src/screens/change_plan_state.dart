import '../shared/types/billing_types.dart';

/// State of the change-plan sheet. Closed, so the sheet cannot show a mix.
sealed class ChangePlanState {
  const ChangePlanState();
}

/// The plans are loading.
final class ChangePlanLoading extends ChangePlanState {
  const ChangePlanLoading();
}

/// The plans loaded and the user is picking one.
final class ChangePlanChoosing extends ChangePlanState {
  const ChangePlanChoosing(this.plans, this.selectedId);

  final List<Plan> plans;

  /// Plan picked so far, or null.
  final String? selectedId;
}

/// The change of [selectedId] is being saved.
final class ChangePlanSaving extends ChangePlanState {
  const ChangePlanSaving(this.plans, this.selectedId);

  final List<Plan> plans;
  final String selectedId;
}

/// Loading the plans or saving the change failed. [plans] is empty when the
/// plans themselves did not load.
final class ChangePlanFailed extends ChangePlanState {
  const ChangePlanFailed(this.plans, this.selectedId, this.error);

  final List<Plan> plans;
  final String? selectedId;
  final Object error;
}

/// The change was saved.
final class ChangePlanDone extends ChangePlanState {
  const ChangePlanDone();
}
