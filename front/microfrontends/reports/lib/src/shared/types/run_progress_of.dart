import 'package:contracts/contracts.dart' show ReportRunStatus;

import '../enums/reports_enums.dart';

/// [RunProgress] of a contract [ReportRunStatus].
extension RunProgressOf on ReportRunStatus {
  RunProgress get progress => switch (this) {
    ReportRunStatus.queued || ReportRunStatus.running => RunProgress.pending,
    ReportRunStatus.ready => RunProgress.ready,
    ReportRunStatus.failed || ReportRunStatus.expired => RunProgress.ended,
  };
}
