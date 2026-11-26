/// Range of days a report covers, ending today.
enum ReportPeriod {
  /// The last week.
  last7Days(7),

  /// The last month.
  last30Days(30),

  /// The last quarter.
  last90Days(90);

  const ReportPeriod(this.days);

  /// Days in the range, today included.
  final int days;
}

/// How a run looks to the user, from its contract status.
enum RunProgress {
  /// Queued or running: the screen reads it again until it ends.
  pending,

  /// Finished successfully: its result can be downloaded.
  ready,

  /// Failed or expired: there is nothing to download.
  ended,
}

/// Where a download ended up.
enum ReportSaveOutcome {
  /// The browser saved the file.
  downloaded,

  /// The platform has no files to save into: the content went to the
  /// clipboard.
  copied,
}
