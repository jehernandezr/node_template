/// Source of the current time. Inject it; never call `DateTime.now()`.
typedef Clock = DateTime Function();

/// The wall clock. The default of composition roots (`ShellHost`, `ShellRuntime`).
DateTime systemClock() => DateTime.now();
