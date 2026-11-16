/// Why an answer failed, as far as the screen needs to tell it apart.
enum ChatFailureKind {
  /// The plan's query quota is used up.
  quotaExceeded,

  /// Any other failure.
  generic,
}
