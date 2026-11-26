/// Operations of a reports repository, so a demo failure can target one call.
enum ReportsOperation {
  /// Loading the catalog.
  catalog,

  /// Requesting a run.
  createRun,

  /// Listing the runs.
  runs,

  /// Loading one run.
  run,

  /// Downloading a result.
  download,
}
