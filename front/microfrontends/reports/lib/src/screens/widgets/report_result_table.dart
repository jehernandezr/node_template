import 'package:contracts/contracts.dart' show ReportColumnKind, ReportResult;
import 'package:material_ui/material_ui.dart';

/// The rows of a ready run, with numbers aligned to the end.
class ReportResultTable extends StatelessWidget {
  /// Table of [result].
  const ReportResultTable({super.key, required this.result});

  /// Rows of the report.
  final ReportResult result;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    child: DataTable(
      columns: [
        for (final column in result.columns)
          DataColumn(
            label: Text(column.header),
            numeric: column.kind == ReportColumnKind.integer,
          ),
      ],
      rows: [
        for (final row in result.rows)
          DataRow(cells: [for (final cell in row.cells) DataCell(Text(cell))]),
      ],
    ),
  );
}
