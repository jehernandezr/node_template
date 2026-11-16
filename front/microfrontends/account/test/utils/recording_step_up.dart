/// Shell step-up for tests: counts the calls and answers [answer].
final class RecordingStepUp {
  RecordingStepUp({this.answer = true});

  /// What every request answers.
  final bool answer;

  /// How many times the step-up was requested.
  int calls = 0;

  /// Requests the step-up.
  Future<bool> call() async {
    calls++;
    return answer;
  }
}
